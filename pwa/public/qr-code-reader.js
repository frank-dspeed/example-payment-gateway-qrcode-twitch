
import { Html5QrcodeScanner } from './components/scanner/github.com/mebjas/html5-qrcode/scanner.js';

window.scannerResult = code => {
    console.log('GOT: ',code)
    document.querySelector('#qr-reader-results').innerHTML += `<div>code - ${code}</div>`
}
function onScanSuccess(qrMessage) {
    // handle the scanned code as you like
    console.log(`QR matched = ${qrMessage}`);
    window.scannerResult(qrMessage)
    document.querySelector("#qr-reader__dashboard_section_csr > span:nth-child(2) > button:nth-child(2)").click();
}

function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning
    //console.warn(`QR error = ${error}`);
}

class QrCodeReader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `<div id="qr-reader" style="width:500px"></div>
        <div id="qr-reader-results"></div>`
        
        let html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader", { fps: 10, qrbox: 250 }, /* verbose= */ true);
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }
}

customElements.define('qrcode-reader',QrCodeReader);