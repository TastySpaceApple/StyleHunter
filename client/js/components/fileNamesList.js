const path = require('path');

class FileNamesList {
    constructor(el){
      this.el = el;
    }

    setList(list){
      this.el.innerHTML =
        list.map(filePath =>
          `<li>
            ${ path.basename(filePath) }
          </li>`)
          .join('')
    }
}

module.exports = { FileNamesList };
