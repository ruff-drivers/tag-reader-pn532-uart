[![Build Status](https://travis-ci.org/ruff-drivers/cardreader-pn532-uart.svg)](https://travis-ci.org/ruff-drivers/cardreader-pn532-uart)

# Card(ISO/IEC14443 Type A) reader dirver for Ruff

NFC chip `PN532` driver with UART interface.

## Supported Engines

* Ruff: >=1.5.0 <1.6.0

## Supported Models

- [pn532](https://rap.ruff.io/devices/pn532)

## Installing

Execute following command and enter a **supported model** to install.

```sh
# Please replace `<device-id>` with a proper ID.
# And this will be what you are going to query while `$('#<device-id>')`.
rap device add <device-id>

# Then enter a supported model, for example:
# ? model: pn532
```

## Usage

Here is the basic usage of this driver.

```js
$('#<device-id>').scanInterval = 1000;
$('#<device-id>').on('card', function (card) {
    console.log('the uid of card is ', card.uid.toString('hex'));
});
```

## API References

### Properties

#### `scanInterval`

Set the scan interval of the card reader, the minimal interval cannot be less than 500ms.

### Events

#### `card`

The `card` event is issued when some card, the type of which is `ISO/IEC14443 Type A`,  is around in the card reader.

## Contributing

Contributions to this project are warmly welcome. But before you open a pull request, please make sure your changes are passing code linting and tests.

You will need the latest [Ruff SDK](https://ruff.io/) to install rap dependencies and then to run tests.

### Installing Dependencies

```sh
npm install
rap install
```

### Running Tests

```sh
npm test
```

## License

The MIT License (MIT)

Copyright (c) 2016 Nanchao Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
