const glob = require('glob');
const path = require('path');
const fs = require('fs');
const Diff = require('diff');

async function compareFolders(folderPath1, folderPath2, diffType){
  const filePaths1 = glob.sync(`${folderPath1}/**/*.scss`)
  const filePaths2 = glob.sync(`${folderPath2}/**/*.scss`)

  const missingFiles = [findMissingFiles(filePaths2, filePaths1), findMissingFiles(filePaths1, filePaths2)]

  const matchingFiles = findMatchingFiles(filePaths1, filePaths2);
  let numMatchingFiles = matchingFiles.length;
  let differentFiles = matchingFiles.map(filePair => {
    let {numRemoved, numAdded, diffs} = compareTwoFiles(filePair[0], filePair[1], diffType);
    return {
      fileName: path.basename(filePair[0]),
      diffs,
      numRemoved,
      numAdded
    }
  })

  differentFiles = differentFiles.filter(fileDiff => fileDiff.numRemoved > 0 || fileDiff.numAdded > 0)

  return { missingFiles, differentFiles, numMatchingFiles }
}

function findMissingFiles(filePaths1, filePaths2){
  return filePaths1.filter(filePath => !filePathsListContains(filePaths2, filePath))
}

function findMatchingFiles(filePaths1, filePaths2){
  let files = []
  filePaths1.forEach(filePath1 => {
    filePath2 = filePathsListContains(filePaths2, filePath1);
    if(!!filePath2)
      files.push([filePath1, filePath2])
  })
  return files;
}

function filePathsListContains(filePaths, filePath){
  let fileName1 = path.basename(filePath);
  return filePaths.find(filePath2 => {
    return path.basename(filePath2) === fileName1;
  })
}

let emptyRegex = /^\s+$/;
let importLineRegex = /^@import/;

const ignoreChanges = /["'][.\/sc]*colors["']/;

function compareTwoFiles(filePath1, filePath2, diffType){
  let fileContent1 = fs.readFileSync(filePath1, 'utf8');
  let fileContent2 = fs.readFileSync(filePath2, 'utf8');

  let diffs;
  switch(diffType){
    case 'css':
      diffs = Diff.diffCss(fileContent1, fileContent2)
      break;
    case 'lines':
    console.log('what')
      diffs = Diff.diffLines(fileContent1, fileContent2, {comparator: function(left, right){
        // console.log(left, right)
        return left.trim() === right.trim();
      }})
      break;
  }

  let numRemoved = 0;
  let numAdded = 0;
  diffs = diffs.filter(diff => {
    let shouldIgnore = emptyRegex.test(diff.value) || ignoreChanges.test(diff.value) || importLineRegex.test(diff.value);
    if(diff.added && shouldIgnore)
      return false;
    if(diff.removed && shouldIgnore)
      diff.removed = false;
    if(diff.removed) numRemoved++;
    if(diff.added) numAdded++;
    return true;
  });

  return {numRemoved, numAdded, diffs};
}

module.exports = {
  compareFolders
};
