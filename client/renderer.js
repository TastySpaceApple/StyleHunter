// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { dialog } = require('electron').remote;
const { FolderInput } = require('./js/components/folderInput.js');
const { FileNamesList } = require('./js/components/fileNamesList.js');
const { compareFolders } = require('../services/compare.js');

let folderInputs = Array.from(document.querySelectorAll('.folder-input'))
  .map(el => new FolderInput(el))

let fileNamesLists = Array.from(document.querySelectorAll('.file-name-list'))
  .map(el => new FileNamesList(el))

const regexImportLine = /^@import/;
const regexEmptyLine = /^\s$/;

async function run(){
  if(document.querySelector('.loader')) document.querySelector('.loader').remove()
  localStorage['folders'] = JSON.stringify(folderInputs.map(input => input.value));
  let diffType = document.querySelector('#selectDiffType').value;
  let result = await compareFolders(folderInputs[0].value, folderInputs[1].value, diffType);

  fileNamesLists[0].setList(result.missingFiles[0])
  fileNamesLists[1].setList(result.missingFiles[1])

  document.querySelector('#changes-title').textContent =
    `Changed Files (${result.differentFiles.length} of ${result.numMatchingFiles})`

  document.querySelector('#filesDiffs').className = 'changes-' + diffType;
  document.querySelector('#filesDiffs').innerHTML =
    result.differentFiles.map(fileitem => {
      let { numRemoved, numAdded, diffs, fileName } = fileitem;
      return `<div class="file-diff">
        <h3>
          <span class="file-name">${fileName}</span>
          <span class="num-lines-removed">Removed: ${numRemoved}</span>
          <span class="num-lines-added">Added: ${numAdded}</span>
        </h3>
        <pre>` +
          diffs.map(diff => {
            let tag = 'span';
            if(diff.removed) tag = 'del';
            if(diff.added) tag = 'ins';
            return `<${tag}>${diff.value}</${tag}>`
          }).join('') +
        `</pre>
      </div>`
    }).join('')
  Array.from(document.querySelectorAll('#filesDiffs h3'))
    .forEach(el => el.addEventListener('click', function(e){
      this.parentElement.classList.toggle('is-open')
    })
  )
}

function log(t) { console.log(t) }

function load(){
  if(localStorage['folders']){
    JSON.parse(localStorage['folders']).forEach((val, i) => {
      folderInputs[i].value = val;
    })
  }
}

load();
document.querySelector('#btnRun').addEventListener('click', run);
document.querySelector('.close').addEventListener('click', () => {window.close()});
