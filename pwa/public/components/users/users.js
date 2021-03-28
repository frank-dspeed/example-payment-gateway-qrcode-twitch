/**
 * Abstraction of DB Operations
 * 
 */
 const currentUsers = localStorage.getItem('Users');
 if (!currentUsers) {
    // Init Store with Example User 
    localStorage.setItem('Users',JSON.stringify([{ points: 0,mail: "example@example.com" }]))
 }


export default () => 
    `<section id="Users">
    <!-- Codes Management Create and List -->
    <ul>
        ${
            JSON.parse(window.localStorage.getItem('Users'))
                .map( ({ points, mail }) => 
                    `<li>${points} - ${mail}</li>` )
                .join('')
        }
    </ul>
    </section>`;