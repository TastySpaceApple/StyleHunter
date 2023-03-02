const glob = require('glob');
const path = require('path');
const fs = require('fs');
const Diff = require('diff');
const { distance } = require('fastest-levenshtein')

async function compareFolders(folderPath1, folderPath2, diffType){
  const filePaths1 = glob.sync(`${folderPath1}/**/*.scss`, {ignore: "**/node_modules/**"})
  const filePaths2 = glob.sync(`${folderPath2}/**/*.scss`, {ignore: "**/node_modules/**"})

  const missingFiles = [findMissingFiles(filePaths1, filePaths2), findMissingFiles(filePaths2, filePaths1)]

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
  differentFiles = differentFiles.sort((item1, item2) => (item2.numAdded + item2.numRemoved) - (item1.numAdded + item1.numRemoved))

  let [filesWithoutMatch1, filesWithoutMatch2] = missingFiles;

  filesWithoutMatch1 = filesWithoutMatch1.map(filePath => { return {filePath, content: readFile(filePath) } })
  filesWithoutMatch2 = filesWithoutMatch2.map(filePath => { return {filePath, content: readFile(filePath) } })

  let renamedFiles = filesWithoutMatch1.map(file => findRenamedFile(file, filesWithoutMatch2, diffType));
  let deletedFiles = renamedFiles.filter(item => item.newFileName === false)
  renamedFiles = renamedFiles.filter(item => item.newFileName !== false)
  renamedFiles = renamedFiles.sort((item1, item2) => (item2.numAdded + item2.numRemoved) - (item1.numAdded + item1.numRemoved))

  deletedFiles = deletedFiles.map(item => item.fileName)

  let newFiles = filesWithoutMatch2.map(file => path.basename(file.filePath))
  newFiles = newFiles.filter(newFile => {
      return renamedFiles.some(renamedFile => renamedFile == newFile)
  })

  // renamedFiles = [];
  return { missingFiles, differentFiles, numMatchingFiles, renamedFiles, deletedFiles, newFiles }
}

function readFile(filePath){
  return fs.readFileSync(filePath, 'utf8');
}

function findRenamedFile(file, fileList, diffType){
  let minDistance = -1, closestFile;
  for(const fileFromList of fileList){
    let d = distance ( file.content, fileFromList.content );
    if(minDistance == -1 || d < minDistance){
      minDistance = d;
      closestFile = fileFromList;
    }
  }

  if(minDistance > Math.max(file.content.length, closestFile.content.length) / 2)
    return { fileName: path.basename(file.filePath), newFileName: false };

  let { numRemoved, numAdded, diffs } =
        compareTwoFiles(file.filePath, closestFile.filePath, diffType);

  return { fileName: path.basename(file.filePath),
           newFileName: path.basename(closestFile.filePath),
           numRemoved, numAdded, diffs}
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
let importLineRegex = /^\s*@import/;

const ignoreChanges = /["'][.\/sc]*colors[.\/sc]*["']/;

function compareTwoFiles(filePath1, filePath2, diffType){
  let fileContent1 = fs.readFileSync(filePath1, 'utf8');
  let fileContent2 = fs.readFileSync(filePath2, 'utf8');

  let diffs;
  switch(diffType){
    case 'css':
      diffs = Diff.diffCss(fileContent1, fileContent2)
      break;
    case 'lines':
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
