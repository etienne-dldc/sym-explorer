const jetpack = require('fs-jetpack');
const path = require('path');
const _ = require('lodash');

const targetPath = '/Users/etienne-dldc/Main';
const outputPath = '/Users/etienne-dldc/MainExplorer';
const dbPath = path.resolve(targetPath, './folders.json');

const targetJet = jetpack.cwd(targetPath);
const defaultObject = {
  ignored: true
}


var foldersIds = null;
var foldersData = {};

function saveData () {
  jetpack.write(dbPath, foldersData);
}

function getdata () {
  if (!jetpack.exists(dbPath)) {
    saveData();
  }
  foldersData = require(dbPath);
}

function listFolders () {
  foldersIds = targetJet.list('.')
  .filter((itemName) => {
    return (
      targetJet.exists(itemName) === 'dir' &&
      !itemName.startsWith('.')
    );
  });
  // console.log(foldersIds);
}

function resolveFolders () {
  console.log('resolveFolders');
  const foldersDataIds = Object.keys(foldersData);
  const missingInDb = _.difference(foldersIds, foldersDataIds);
  missingInDb.forEach((folderId) => {
    foldersData[folderId] = defaultObject;
  });
  const notFolders = _.difference(foldersDataIds, foldersIds);
  console.log('Not Folders : ');
  console.log(notFolders);
  saveData();
}

function createPath (item) {
  return [
    item.config.year || 'Other',
    ...item.config.orga
  ];
}

function createOutput () {
  // clean out
  if (jetpack.exists(outputPath)) {
    jetpack.remove(outputPath);
  }
  const outputJet = jetpack.dir(outputPath);
  // generate path
  const itemsCollection = _(foldersData)
    // Convert to collection
    .map((config, folderName) => ({ folderName, config }))
    // remove ignored
    .filter(item => {
      return item.config.ignored !== true;
    })
    .value()

  console.log(itemsCollection);

  const years = _(itemsCollection)
    .groupBy(item => item.config.year || 'all')
    .keys()
    .filter(year => year !== 'all')
    .value();

  console.log(years);

  const outputs = _(itemsCollection)
    // No year mean all years
    .map(item => {
      if (!_.isNumber(item.config.year)) {
        return _.map(years, (year) => {
          const newItem = _.cloneDeep(item);
          newItem.config.year = year;
          return item;
        })
      }
      return item;
    })
    .flatten()
    // Generate path
    .map(item => {
      return Object.assign(
        {},
        item,
        {
          path: createPath(item)
        }
      );
    })
    // Deal with same path
    .groupBy(item => item.path.join('/'))
    .map(items => {
      if (items.length > 1) {
        _.each(items, (item, index) => {
          console.log('===> ' + item.config.year);
          const year = item.config.year || ('Timeless' + index);
          item.path[item.path.length-1] = year + '-' + item.path[item.path.length-1];
        });
      }
      return items;
    })
    .flatten()
    .value()

  console.log('========= outputs ==========');
  console.log(JSON.stringify(outputs, null, 2));

  _.each(outputs, (item) => {
    jetpack.symlink(
      path.resolve(targetPath, item.folderName),
      path.resolve(outputPath, item.path.join('/'))
    );
  });

}

function run () {
  Promise.resolve()
  .then(() => listFolders())
  .then(() => getdata())
  .then(() => resolveFolders())
  .then(() => createOutput())
  .catch((e) => {
    console.error(e);
  })
}

run();
