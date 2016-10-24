'use strict';

var pn532 = require('./pn532-def');
var PN532_PREAMBLE = pn532.Frame.PREAMBLE;
var PN532_STARTCODE1 = pn532.Frame.STARTCODE1;
var PN532_STARTCODE2 = pn532.Frame.STARTCODE2;
var PN532_POSTAMBLE = pn532.Frame.POSTAMBLE;
var PN532_HOSTTOPN532 = pn532.HOSTTOPN532;

/*
normal information frame
Preamble                0x00
StartCode               0x00FF
PacketLength            Len(1 byte)
PacketLength Checksum   LCS (LEN + LCS = 0x00)
PN532 Frame Identifier  TFI (0xD4 for host-to-PN532; 0xD5 for PN532-to-host)
Packet Data             PD0, PD1, ..., PDn
Packet Data Checksum    DCS (TFI + PD0 + PD1 + ... + PDn + DCS = 0x00)
Postabmle               0x00
*/

function generateCommand(cmd) {
    var checksum = 0;
    var cmdLen = cmd.length + 1;
    var cmdFrame = [
        PN532_PREAMBLE,
        PN532_STARTCODE1,
        PN532_STARTCODE2,
        cmdLen,
        (~cmdLen + 1) & 0xFF,
        PN532_HOSTTOPN532
    ];
    checksum += PN532_HOSTTOPN532;

    for (var i = 0; i < cmd.length; i++) {
        cmdFrame.push(cmd[i]);
        if (cmd[i]) {
            checksum += cmd[i];
        }
    }
    cmdFrame.push((~checksum + 1) & 0xFF);
    cmdFrame.push(PN532_POSTAMBLE);
    var cmdBuffer = new Buffer(cmdFrame);
    return cmdBuffer;
}
module.exports = generateCommand;
