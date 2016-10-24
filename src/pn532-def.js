'use strict';

var pn532 = Object.create(null);

pn532.Command = Object.create(null);
pn532.Command.INLISTPASSIVETARGET = 0x4A;
pn532.Command.GETFIRMWAREVERSION = 0x02;
pn532.Command.SAMCONFIGURATION = 0x14;
pn532.Command.DIAGNOSE = 0x00;

pn532.Frame = Object.create(null);
pn532.Frame.PREAMBLE = 0x00;
pn532.Frame.STARTCODE1 = 0x00;
pn532.Frame.STARTCODE2 = 0xFF;
pn532.Frame.POSTAMBLE = 0x00;
pn532.Frame.ACKFRAME = new Buffer([0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00]);
pn532.Frame.HEADPART = new Buffer([0x00, 0x00, 0xFF]);

pn532.HOSTTOPN532 = 0xD4;
pn532.PN532TOHOST = 0xD5;
pn532.MODE_MIFARE_ISO14443A = 0x00;
pn532.SAM_NORMAL_MODE = 0x01;

module.exports = pn532;
