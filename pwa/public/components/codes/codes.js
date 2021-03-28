export const getCodes = () => JSON.parse(localStorage.getItem('Codes'));
export const setCodes = currentCodes => localStorage.setItem('Codes', JSON.stringify(currentCodes))
const codeToUrl = code => `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify(code))}`;

// We use this Method to be fail save
const currentCodes = localStorage.getItem('Codes');
if (!currentCodes) {
    const exampleCode = { points: 5, code: "https://de.wikipedia.org" }
    const exampleCodeWithUrl = { ...exampleCode, url: codeToUrl(exampleCode) }
    setCodes([exampleCodeWithUrl]);
}

const addCode = (hash,points=1) => {
    const code = { hash, points };
    const currentCodes = getCodes();
    const currentCode = {
        hash, points, url: codeToUrl(code)
    }
    currentCodes.push(currentCode)
    setCodes(currentCodes);
    return currentCode
}

const useCode = (email,codeHash) => {
    if (!email && !codeHash) {
        throw new Error('No Email, codeHash Provided Usage (email,codeHash)')
    }
    if (!email) {
        throw new Error('No Email Provided Usage (email,codeHash)')
    }
    if (!codeHash) {
        throw new Error('No codeHash Provided Usage (email,codeHash)')
    }
    const currentCodes = getCodes();
    const currentCode = currentCodes.find(x=>x.code === codeHash);
    if (!currentCode) {
        throw new Error('currentCode is invalid')
    }
    if (currentCode && currentCode.mail) {
        throw new Error('currentCode is usedAlready')
    }
    currentCode.email = email;
    setCodes(currentCodes);   
    return currentCode;
}

const resetCode = codeHash => {
    if (!codeHash) {
        throw new Error('No codeHash Provided Usage (email,codeHash)')
    }
    const currentCodes = getCodes();
    const currentCode = currentCodes.find(x=>x.code === codeHash);
    if (!currentCode) {
        throw new Error('currentCode is invalid')
    }
    if (currentCode && !currentCode.mail) {
        throw new Error('currentCode is NOT usedAlready')
    }
    delete currentCode.mail
    setCodes(currentCodes);
    return currentCode
}

const listenClicks = list => {
    list.addEventListener("click", function(event) {
        const target = event.target;        
        //ignore clicks on anything but checkbox
        if (target.type !== "submit") {
            return;
        }
        //apply css here
        if (target.innerText === "Reset") {
            resetCode(target.getAttribute('code'))
        }
        
        //target.parentNode.style.textDecoration = "line-through";
    });
}

customElements.define('component-codes',class extends HTMLElement {
    connectedCallback() {
        this.innerHTML = this.getCodes();
        const list = this.querySelector('ul')
        listenClicks(list);
    }
    getCodes() {
        return `<ul>
        ${getCodes().map( ({ points, url, code, mail }) => {
            console.log(url)
            return `<li>${code} - ${points} - <a  target="_blank" href="${url}">Get as QR </a> ${mail?mail: 'Not Used'}<button code="${code}">Reset</button> </li>` 
        }).join('')}
        </ul>
        <input id="addCode" type="text"></input>
        <button>Add Code</button>`
    }
})

export default () => 
    `<!-- Codes Management Create and List -->
    <component-codes></component-codes>
    `;



