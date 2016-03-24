var Scout = require('zetta-scout');
var util = require('util');
var HoneywellTotalConnectLight = require('./honeywell_total_connect_light');
var SECURITY_DEVICE_CLASS_ID = 3;

var HoneywellTotalConnectLightScout = module.exports = function() {
  Scout.call(this);
};
util.inherits(HoneywellTotalConnectLightScout, Scout);

HoneywellTotalConnectLightScout.prototype.init = function(next) {
  var lightQuery = this.server.where({ type: 'light' });
  var automationQuery = this.server.where({ type: 'automation' });
  var soapQuery = this.server.where({ type: 'soap' });

  var self = this;
  
  this.server.observe([automationQuery, soapQuery], function(honeywellAutomation, honeywellSoap) {
    console.log('AutomationData HoneywellTotalConnectLightScout init: ' + util.inspect(honeywellAutomation.AutomationData));
    console.log('AutomationData AutomationSwitch HoneywellTotalConnectLightScout init: ' + util.inspect(honeywellAutomation.AutomationData.AutomationSwitch.SwitchInfo));
    var lightDevices = honeywellAutomation.AutomationData.AutomationSwitch.SwitchInfo;
    for (i=0; i < lightDevices.length; i++) {
      var lightDevice = lightDevices[i];
      (function(lightDevice){
        var query = self.server.where({type: 'light', SwitchID: lightDevice.SwitchID, DeviceID: lightDevice.DeviceID});
        self.server.find(query, function(err, results) {
          if (results[0]) {
            self.provision(results[0], HoneywellTotalConnectLight, honeywellSoap, lightDevice, honeywellAutomation);
          } else {
            self.discover(HoneywellTotalConnectLight, honeywellSoap, lightDevice, honeywellAutomation);
          }
        });
      })(lightDevice);
    }
    next();
  });
}