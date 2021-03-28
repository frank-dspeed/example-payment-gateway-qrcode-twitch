export default {
    getTag: name => `<${name}></${name}>`,
    qs: query => document.querySelector(query)
}