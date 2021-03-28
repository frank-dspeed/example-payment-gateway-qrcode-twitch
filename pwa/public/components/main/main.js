customElements.define('components-main',class componentsMain extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `<header>
            <title></title>
            <navigation><ul>
                <li><a href="#loc=Codes">Codes</a></li>
                <li><a href="#loc=Users">Users</a></li>
                <li><a href="#User">User</a></li>
            </ul></navigation>
        </header><section id="main"></section>`;
        window.addEventListener('hashchange', this.load)
        this.load();
        
    }
    disconnectedCallback() {
        window.removeEventListener('hashchange', this.load)
    }
    load() {
        const hashParms = location.hash
            .substr(1)
            .split("&")
            .map(v => v.split("="))
            .reduce( (pre, [key, value]) => ({ ...pre, [key]: value }), {} );
        
  
            const hashMap = {
                'main': '',
                Codes: import('../codes/codes.js').then(m => m.default()),
                Users: import('../users/users.js').then(m => m.default()),
            };
       
            (async ()=>{
                document.querySelector('#main').innerHTML = await hashMap[hashParms.loc] || '';     
            })()
            
       
        
    }
})