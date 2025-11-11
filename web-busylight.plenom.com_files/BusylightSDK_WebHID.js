
var timeoutId = 0;
var timeouts = {};
var worker = new Worker("timeoutWorker.js");
worker.addEventListener("message", function(evt) {
	var data = evt.data,
		id = data.id,
		fn = timeouts[id].fn,
		args = timeouts[id].args;
	fn.apply(null, args);
	delete timeouts[id];
});

window.setTimeout = function(fn, delay) {
	var args = Array.prototype.slice.call(arguments, 2);
	timeoutId += 1;
	delay = delay || 0;
	var id = timeoutId;
	timeouts[id] = { fn: fn, args: args };
	worker.postMessage({ command: "setTimeout", id: id, timeout: delay });
	return id;
};

window.clearTimeout = function(id) {
	worker.postMessage({ command: "clearTimeout", id: id });
	delete timeouts[id];
};


let deviceFilter = { vendorId: 0x4d8, productId: 0xf848 }; // Bl Model 1
let deviceFilter2 = { vendorId: 0x27BB, productId: 0x3BCD }; // Omega Model
let deviceFilter3 = { vendorId: 0x27BB, productId: 0x3BCA }; // Alpha Model
let deviceFilter4 = { vendorId: 0x27BB, productId: 0x3BCF }; // Omega Model 2
let deviceFilter5 = { vendorId: 0x27BB, productId: 0x3BCE }; // Alpha Model 2
let deviceFilter6 = { vendorId: 0x27BB, productId: 0x3bcb }; // UC Model


function BusylightColor(red, green, blue) {
	this.rgbred = red;
	this.rgbblue = blue;
	this.rgbgreen = green;
}

let BusylightColor_Green = new BusylightColor(0, 100, 0);
let BusylightColor_Blue = new BusylightColor(0, 0, 100);
let BusylightColor_Red = new BusylightColor(100, 0, 0);
let BusylightColor_Yellow = new BusylightColor(100, 100, 0);
let BusylightColor_Orange = new BusylightColor(100, 26, 0);
let BusylightColor_Purple = new BusylightColor(70, 0, 87);

function BusylightCommandStep() {
	this.NextStep = 0; // int
	this.RepeatInterval = 0; //byte
	this.Color = new BusylightColor(0, 0, 0);
	this.OnTimeSteps = 0;
	this.OffTimeSteps = 0;
	this.AudioByte = 0;
}

let BusylightSoundclips = {

	"OpenOffice": 1,
	"Quiet": 2,
	"Funky": 3,
	"FairyTale": 4,
	"KuandoTrain": 5,
	"TelephoneNordic": 6,
	"TelephoneOriginal": 7,
	"TelephonePickMeUp": 8,
	"IM1": 9,
	"IM2": 10,
};

let BusylightVolume = {
	"Max": 6,
	"High": 5,
	"Middle": 3,
	"Low": 2,
	"Mute": 0,
};

let BusylightPulseSequence = {
	"Color": BusylightColor_Red,
	"Step1": 3,
	"Step2": 21,
	"Step3": 36,
	"Step4": 50,
	"Step5": 36,
	"Step6": 21,
	"Step7": 10,
};


let requestParams = { filters: [deviceFilter, deviceFilter2, deviceFilter3, deviceFilter4, deviceFilter5, deviceFilter6] };
let outputReportId = 0x00;
let outputReport = new Uint8Array([64]);
let busylightdevices = null;
let device = null;

function handleConnectedDevice(e) {
	console.log("Device connected: " + e.device.productName);
}

function handleDisconnectedDevice(e) {
	console.log("Device disconnected: " + e.device.productName);
}

this.handleInputReport = function(e) {
	console.log(e.device.productName + ": got input report " + e.reportId);
	console.log(new Uint8Array(e.data.buffer));
}


navigator.hid.addEventListener("connect", handleConnectedDevice);
navigator.hid.addEventListener("disconnect", handleDisconnectedDevice);

function BusylightSDK() {

	this.start = async function(showPicker, OnConnected) {
		this.device = await this.getDevice(showPicker);
		if (!this.device) {
			return false;
		}
		if (this.device.opened) {
			return true;
		}
		// Open and reset the device.
		await this.device.open();
		console.log("Opened device: " + this.device.productName);
		this.device.addEventListener("inputreport", this.handleInputReport);
		console.log("this.device?.opened", this.device?.opened);
		this.SetTimer();
		OnConnected();
		return true;
	}

	this.getDevice = async function(showPicker) {
		let previousDevice = await this.getPreviousDevice();
		if (previousDevice) {
			return previousDevice;
		}
		if (showPicker) {
			const opts = { filters: [deviceFilter, deviceFilter2, deviceFilter3, deviceFilter4, deviceFilter5, deviceFilter6] };
			let devices = await navigator.hid.requestDevice(opts);
			return devices[0];
		}
		return null;
	}

	this.getPreviousDevice = async function() {
		let devices = await navigator.hid.getDevices();
		for (let device of devices) {
			if (device.vendorId === 10171) {
				this.device = device;
				return device;
			}
		}
		return null;
	}

	this.GenerateCommands = function(steps) {
		var bytes = new Uint8Array(64);
		//bytes[0]=0;
		var counter = 0;

		for (i = 0; i < steps.length; i++) {
			if ((steps[i].NextStep & 0xF0) == 0) {
				bytes[counter] = steps[i].NextStep | 0x10;
			}
			else {
				bytes[counter] = steps[i].NextStep;
			}
			counter++;
			bytes[counter] = steps[i].RepeatInterval;
			counter++;
			if (steps[i].Color) {
				bytes[counter] = steps[i].Color.rgbred;
				counter++;
				bytes[counter] = steps[i].Color.rgbgreen;
				counter++;
				bytes[counter] = steps[i].Color.rgbblue;
				counter++;
			}
			bytes[counter] = steps[i].OnTimeSteps;
			counter++;
			bytes[counter] = steps[i].OffTimeSteps;
			counter++;
			bytes[counter] = steps[i].AudioByte;
			counter++;
		}

		if (counter < bytes.length) {
			for (i = counter; i < bytes.length; i++) {
				bytes[i] = 0;
			}
		}

		for (i = 59; i <= 61; i++) {
			bytes[i] = 0xff;
		}

		var checksum = 0;

		for (i = 0; i < 62; i++) {
			checksum += bytes[i];
		}

		bytes[62] = (checksum / 256);
		bytes[63] = (checksum % 256);

		return bytes;
	};

	this.GetAudioByte = function(soundclip, volume) {
		var retval = 0x80;

		retval += (soundclip * 0x08) + volume;

		return retval;
	};

	this.WriteToDevice = function(bytes) {
		this.device.sendReport(outputReportId, bytes).then(() => {
			console.log("Sent output report " + outputReportId);
		});
	}


	this.SetTimer = function() {
		var inst = this;
		setTimeout(() => { // Worker timeout overrides setTimeout. This is considered bad practice, so should probably be used as an utility instead
			console.log("Timer from web worker ran");
			let cmd = new BusylightCommandStep();
			cmd.NextStep = 0x8F;
			let cmdbytes = inst.GenerateCommands([cmd]);
			inst.WriteToDevice(cmdbytes);
			inst.SetTimer(); // Start new timer
		}, 10000);
	}

	this.GetPulseColor = function(intensity, color) {
		let intens = Math.min(100, intensity);
		return new BusylightColor((color.rgbred * intens) / 100, (color.rgbgreen * intens) / 100, (color.rgbblue * intens) / 100);
	};

	this.ColorRGB = function(r, g, b) {
		this.Color(new BusylightColor(r, g, b));
	};


	this.Color = function(color) {
		var cmd = new BusylightCommandStep();
		cmd.Color = color;
		cmd.AudioByte = 128;
		cmd.NextStep = 0;
		cmd.OffTimeSteps = 0;
		cmd.OnTimeSteps = 1;
		cmd.RepeatInterval = 1;
		let cmdbytes = this.GenerateCommands([cmd]);
		this.WriteToDevice(cmdbytes);
	};

	this.Alert = function(color, soundclip, volume) {
		var cmd = new BusylightCommandStep();
		cmd.Color = color;
		cmd.AudioByte = this.GetAudioByte(soundclip, volume);
		cmd.NextStep = 0;
		cmd.OffTimeSteps = 5;
		cmd.OnTimeSteps = 3;
		cmd.RepeatInterval = 120;
		let cmdbytes = this.GenerateCommands([cmd]);
		this.WriteToDevice(cmdbytes);
	};

	this.Blink = function(color, ontime, offtime) {
		var cmd = new BusylightCommandStep();
		cmd.Color = color;
		cmd.AudioByte = 128;
		cmd.NextStep = 0;
		cmd.OffTimeSteps = offtime;
		cmd.OnTimeSteps = ontime;
		cmd.RepeatInterval = 0;
		let cmdbytes = this.GenerateCommands([cmd]);
		this.WriteToDevice(cmdbytes);
	};

	this.Pulse = function(sequence) {
		var cmd1 = new BusylightCommandStep();
		cmd1.Color = this.GetPulseColor(sequence.Step1, sequence.Color);
		cmd1.AudioByte = 128;
		cmd1.NextStep = 1;
		cmd1.OffTimeSteps = 0;
		cmd1.OnTimeSteps = 1;
		cmd1.RepeatInterval = 0;

		var cmd2 = new BusylightCommandStep();
		cmd2.Color = this.GetPulseColor(sequence.Step2, sequence.Color);
		cmd2.AudioByte = 128;
		cmd2.NextStep = 2;
		cmd2.OffTimeSteps = 0;
		cmd2.OnTimeSteps = 1;
		cmd2.RepeatInterval = 0;

		var cmd3 = new BusylightCommandStep();
		cmd3.Color = this.GetPulseColor(sequence.Step3, sequence.Color);
		cmd3.AudioByte = 128;
		cmd3.NextStep = 3;
		cmd3.OffTimeSteps = 0;
		cmd3.OnTimeSteps = 1;
		cmd3.RepeatInterval = 0;

		var cmd4 = new BusylightCommandStep();
		cmd4.Color = this.GetPulseColor(sequence.Step4, sequence.Color);
		cmd4.AudioByte = 128;
		cmd4.NextStep = 4;
		cmd4.OffTimeSteps = 0;
		cmd4.OnTimeSteps = 1;
		cmd4.RepeatInterval = 0;

		var cmd5 = new BusylightCommandStep();
		cmd5.Color = this.GetPulseColor(sequence.Step5, sequence.Color);
		cmd5.AudioByte = 128;
		cmd5.NextStep = 5;
		cmd5.OffTimeSteps = 0;
		cmd5.OnTimeSteps = 1;
		cmd5.RepeatInterval = 0;

		var cmd6 = new BusylightCommandStep();
		cmd6.Color = this.GetPulseColor(sequence.Step6, sequence.Color);
		cmd6.AudioByte = 128;
		cmd6.NextStep = 6;
		cmd6.OffTimeSteps = 0;
		cmd6.OnTimeSteps = 1;
		cmd6.RepeatInterval = 0;

		var cmd7 = new BusylightCommandStep();
		cmd7.Color = this.GetPulseColor(sequence.Step7, sequence.Color);
		cmd7.AudioByte = 128;
		cmd7.NextStep = 0;
		cmd7.OffTimeSteps = 0;
		cmd7.OnTimeSteps = 1;
		cmd7.RepeatInterval = 0;

		let cmdbytes = this.GenerateCommands([cmd1, cmd2, cmd3, cmd4, cmd5, cmd6, cmd7]);
		this.WriteToDevice(cmdbytes);
	};

	this.ColorWithFlash = function(color, flashcolor) {
		var cmd1 = new BusylightCommandStep();
		cmd1.Color = flashcolor;
		cmd1.AudioByte = 128;
		cmd1.NextStep = 1;
		cmd1.OffTimeSteps = 0;
		cmd1.OnTimeSteps = 5;
		cmd1.RepeatInterval = 1;

		var cmd2 = new BusylightCommandStep();
		cmd2.Color = color;
		cmd2.AudioByte = 128;
		cmd2.NextStep = 0;
		cmd2.OffTimeSteps = 0;
		cmd2.OnTimeSteps = 30;
		cmd2.RepeatInterval = 0;
		let cmdbytes = this.GenerateCommands([cmd1, cmd2]);
		this.WriteToDevice(cmdbytes);
	};


}
