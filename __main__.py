import subprocess
import sys
import time

import hid

# import usb.core
# import usb.util

# Find the USB device by vendor ID and product ID
vendor_id = 0x27BB  # Replace with your device's vendor ID
product_id = 0x3BCF  # Replace with your device's product ID

# device = usb.core.find(idVendor=vendor_id, idProduct=product_id)
# if device is None:
#     raise ValueError("Device not found")
# # Claim the interface
# # interface = device[0]
# device.set_configuration()
# cfg = device.get_active_configuration()

# intf = cfg[(0, 0)]
# ep = usb.util.find_descriptor(
#     intf,
#     # match the first OUT endpoint
#     custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress)
#     == usb.util.ENDPOINT_OUT,
# )
# alternate_setting = interface.bInterfaceNumber
# interface.set_altsetting(alternate_setting)
# Send bytes to the device


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

    def WriteToDevice(self, bytes_array):
        print(bytes_array)
        # implement device communication logic here

    def SetTimer(self):
        # implement timer logic here
        pass

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
        # self.WriteToDevice(cmd_bytes)


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

red_data_to_send = [
    16,
    1,
    100,
    0,
    0,
    1,
    0,
    128,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    255,
    255,
    255,
    3,
    243,
]

green_data_to_send = [
    143,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    255,
    255,
    255,
    3,
    140,
]


sdk = BusylightSDK()
# print(set(green_data_to_send) - set(sdk.Color(BusylightColor_Red)))
# print(list(sdk.Color(BusylightColor_Green)))
# print(list(sdk.Color(BusylightColor_Red)))
# print(sys.argv[1] == "red")
while True:
    try:
        with hid.Device(vendor_id, product_id) as h:
            # print(f"Device manufacturer: {h.manufacturer}")
            # print(f"Product: {h.product}")
            # print(f"Serial Number: {h.serial}")
            # h.nonblocking = 0
            is_in_dnd = (
                subprocess.run(
                    [
                        "defaults",
                        "read",
                        "com.apple.controlcenter",
                        "NSStatusItem Visible FocusModes",
                    ],
                    capture_output=True,
                ).stdout.decode("utf-8")[0]
                == "1"
            )
            bytes_to_send = bytes(
                sdk.Color(BusylightColor_Red if is_in_dnd else BusylightColor_Green)
            )
            h.write(bytes_to_send)
            print("In DND" if is_in_dnd else "Not in DND")
    except hid.HIDException as e:
        print("Error: ", e)

    time.sleep(2)

# endpoint = interface[0]
# ep.write(data_to_send)
# Release the interface
# usb.util.release_interface(device, interface.bInterfaceNumber)
