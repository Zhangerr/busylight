import datetime
import subprocess
import time

import hid

# From `system_profiler SPUSBDataType`

vendor_id = 0x27BB
product_id = 0x3BCF


class BusylightCommandStep:
    def __init__(self):
        self.NextStep = 0  # int
        self.RepeatInterval = 0  # byte
        self.Color = BusylightColor(0, 0, 0)
        self.OnTimeSteps = 0
        self.OffTimeSteps = 0
        self.AudioByte = 0


class BusylightSDK:
    def __init__(self):
        pass

    def GenerateCommands(self, steps):
        bytes_array = bytearray(64)
        counter = 0
        for step in steps:
            if (step.NextStep & 0xF0) == 0:
                bytes_array[counter] = step.NextStep | 0x10
            else:
                bytes_array[counter] = step.NextStep
            counter += 1
            bytes_array[counter] = step.RepeatInterval
            counter += 1
            if step.Color:
                bytes_array[counter] = step.Color.rgbred
                counter += 1
                bytes_array[counter] = step.Color.rgbgreen
                counter += 1
                bytes_array[counter] = step.Color.rgbblue
                counter += 1
            bytes_array[counter] = step.OnTimeSteps
            counter += 1
            bytes_array[counter] = step.OffTimeSteps
            counter += 1
            bytes_array[counter] = step.AudioByte
            counter += 1
        if counter < len(bytes_array):
            for i in range(counter, len(bytes_array)):
                bytes_array[i] = 0
        for i in range(59, 62):
            bytes_array[i] = 0xFF
        checksum = sum(bytes_array[:62])
        bytes_array[62] = checksum // 256
        bytes_array[63] = checksum % 256
        return bytes_array

    def GetPulseColor(self, intensity, color):
        intens = min(100, intensity)
        return BusylightColor(
            (color.rgbred * intens) // 100,
            (color.rgbgreen * intens) // 100,
            (color.rgbblue * intens) // 100,
        )

    def ColorRGB(self, r, g, b):
        self.Color(BusylightColor(r, g, b))

    def Color(self, color):
        cmd = BusylightCommandStep()
        cmd.Color = color
        cmd.AudioByte = 128
        cmd.NextStep = 0
        cmd.OffTimeSteps = 0
        cmd.OnTimeSteps = 1
        cmd.RepeatInterval = 1
        cmd_bytes = self.GenerateCommands([cmd])
        return cmd_bytes


class BusylightColor:
    def __init__(self, rgbred, rgbgreen, rgbblue):
        self.rgbred = rgbred
        self.rgbgreen = rgbgreen
        self.rgbblue = rgbblue


BusylightColor_Green = BusylightColor(0, 100, 0)
BusylightColor_Blue = BusylightColor(0, 0, 100)
BusylightColor_Red = BusylightColor(100, 0, 0)
BusylightColor_Yellow = BusylightColor(100, 100, 0)
BusylightColor_Orange = BusylightColor(100, 26, 0)
BusylightColor_Purple = BusylightColor(70, 0, 87)


sdk = BusylightSDK()


def get_status(is_in_dnd, is_camera_open):
    if is_in_dnd:
        return ("in DND", BusylightColor_Red)
    elif is_camera_open:
        return ("in meeting", BusylightColor_Orange)
    else:
        return ("available", BusylightColor_Green)


while True:
    try:
        with hid.Device(vendor_id, product_id) as h:
            # https://stackoverflow.com/questions/71807412/how-to-read-do-not-disturb-using-applescript
            # https://stackoverflow.com/questions/89228/how-do-i-execute-a-program-or-call-a-system-command
            try:
                is_in_dnd = (
                    subprocess.run(
                        [
                            "defaults",
                            "read",
                            "com.apple.controlcenter",
                            "NSStatusItem VisibleCC FocusModes",
                        ],
                        capture_output=True,
                    ).stdout.decode("utf-8")[0]
                    == "1"
                )
            except:
                is_in_dnd = False
            is_camera_open = (
                subprocess.run(
                    ["lsof -n | grep ImagingNetworks"], capture_output=True, shell=True
                ).returncode
                == 0
            )
            status, color = get_status(is_in_dnd, is_camera_open)
            bytes_to_send = bytes(sdk.Color(color))
            h.write(bytes_to_send)

            # https://stackoverflow.com/questions/5419389/how-to-overwrite-the-previous-print-to-stdout
            print(
                f"\r\033[2K [{datetime.datetime.now()}] " + status,
                end="",
                flush=True,
            )
            time.sleep(2)
    except Exception as e:
        print(f"\r\033[2K [{datetime.datetime.now()}] Error: ", e, end="", flush=True)
        time.sleep(10)
