(function() {
  var ui = {
    green: null,
    red: null,
    alert: null,
    blink: null,
    pulse: null,
    flash: null,
    off: null,
    allow: null,
    purple: null
  };

/*
  var connection = -1; */
  var busylightSDK = new BusylightSDK();


  var initializeWindow = function() {
    for (var k in ui) {
      var id = k.replace(/([A-Z])/, '-$1').toLowerCase();
      var element = document.getElementById(id);
      if (!element) {
        throw "Missing UI element: " + k;
      }
      ui[k] = element;
    }
    enableIOControls(false);
    ui.allow.addEventListener('click', onAllowClicked);
    ui.green.addEventListener('click', onGreenClicked);
    ui.red.addEventListener('click', onRedClicked);
    ui.alert.addEventListener('click', onAlertClicked);
    ui.blink.addEventListener('click', onBlinkClicked);
    ui.pulse.addEventListener('click', onPulseClicked);
    ui.flash.addEventListener('click', onFlashClicked);
    ui.off.addEventListener('click', onOffClicked);
    ui.purple.addEventListener('click', onPurpleClicked);
    //ui.allow.disabled=false;
    /*
    * Try to connect to prev approved devices at launch
    */
    let useDevicePicker = false;
	busylightSDK.start(useDevicePicker, onBusyLightConnected);

  };

    var enableIOControls = function (ioEnabled) {
        if (ioEnabled) {
            ui.green.style.display = "";
            ui.red.style.display = "";
            ui.alert.style.display = "";
            ui.blink.style.display = "";
            ui.pulse.style.display = "";
            ui.flash.style.display = "";
            ui.purple.style.display = "";
            ui.off.style.display = "";
            ui.allow.style.display = "none";
        }
        else {
            ui.green.style.display = "none";
            ui.red.style.display = "none";
            ui.alert.style.display = "none";
            ui.blink.style.display = "none";
            ui.pulse.style.display = "none";
            ui.flash.style.display = "none";
            ui.purple.style.display = "none";
            ui.off.style.display = "none";
            ui.allow.style.display = "";
        }
    ui.green.disabled = !ioEnabled;
    ui.red.disabled = !ioEnabled;
    ui.alert.disabled = !ioEnabled;
    ui.blink.disabled = !ioEnabled;
    ui.pulse.disabled = !ioEnabled;
    ui.flash.disabled = !ioEnabled;
    ui.purple.disabled = !ioEnabled;
    ui.off.disabled = !ioEnabled;
  };

  var onAllowClicked = function() {
    console.log("Starting...");
    let useDevicePicker = true;
    busylightSDK.start(useDevicePicker, onBusyLightConnected);
  };

  function onBusyLightConnected(){
	 busylightSDK.ColorRGB(0,100,0); 
	 enableIOControls(true);
  }

  var onGreenClicked = function() {
    busylightSDK.ColorRGB(0,100,0); 
  };

  var onRedClicked = function() {
      busylightSDK.Color(BusylightColor_Red);
  };

  var onAlertClicked = function() {
      busylightSDK.Alert(BusylightColor_Blue, BusylightSoundclips.KuandoTrain, BusylightVolume.High);
  };

  var onBlinkClicked = function() {
    busylightSDK.Blink(BusylightColor_Green,3,5); 
  };

  var onPulseClicked = function () {
      busylightSDK.Pulse(BusylightPulseSequence);
  };

  var onFlashClicked = function () {
      busylightSDK.ColorWithFlash(BusylightColor_Red, BusylightColor_Blue);
  };

  var onPurpleClicked = function () {
      busylightSDK.Color(BusylightColor_Purple);
  };

  var onOffClicked = function() {
    busylightSDK.ColorRGB(0,0,0); 
  };


  window.addEventListener('load', initializeWindow);
}());
