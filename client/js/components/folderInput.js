const {dialog} = require('electron').remote;

 class FolderInput {
  constructor(el){
    this.el = el;
    this.bindEvents();
  }

  bindEvents(){
    this.el.querySelector('button').addEventListener('click', e => this.openFolderDialog())
  }

  openFolderDialog(){
    dialog.showOpenDialog({
        defaultPath: this.value,
        properties: ['openDirectory']
    })
    .then(result => {
      if(result.filePaths.length > 0)
        this.value = result.filePaths[0];
    })
  }

  set value(val) {
    this.el.querySelector('input').value = val;
  }

  get value(){
    return this.el.querySelector('input').value;
  }
}

module.exports = {FolderInput};
