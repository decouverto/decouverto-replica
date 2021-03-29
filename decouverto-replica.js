const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), './.env') });

const request = require('request');
const report = require('./lib/report');
const fs = require('fs-extra');
const series = require('async-series');
const colors = require('colors');

if (process.env.NODE_ENV === 'production') {
    console.log = function() {};
}

let folder = path.resolve(process.cwd(), '../decouverto-website');
let walksFolder = path.join(folder, '/walks');

console.log('Téléchargement de la liste des balades'.yellow);
request.get('https://decouverto.fr/save/index.json', function(err, res, body) {
    if (err) return report(err, 'Impossible de télécharger la liste des balades');
    console.log('Liste des balades téléchargée'.green);
    let p = path.join(walksFolder, '/index.json');
    fs.writeFile(p, body, function(err, data) {
        if (err) {
            report(err, 'Erreur lors de l\'écriture de index.json');
        }
        console.log('Sauvegarde de la liste réussie'.green);
    });
    const files = JSON.parse(body);



    const tasks = files.map(element => {
        let p = path.join(walksFolder, '/' + element.id + '.zip');
        return function(callback) {
            request.get('https://decouverto.fr/save/' + element.id + '.zip')
                .on('error', function(err) {
                    console.log(colors.red('Erreur lors du téléchargement de ' + element.id + '.zip'));
                    return callback(err);
                })
                .pipe(fs.createWriteStream(p))
                .on('finish', function() {
                    console.log(colors.green('Sauvegarde de ' + element.id + '.zip réussie'));
                    callback(null);
                });
        }
    });

    const metaTask = function(callback) {
        request.get('https://decouverto.fr/save/metas.json', function(err, res, body) {
            if (err) return callback(err);
            console.log('Méta-données téléchargées'.green);
            let p = path.join(folder, '/metas.json');
            fs.writeFile(p, body, function(err, data) {
                if (err) return callback(err);
                callback(null);
            });
        });
    }

    const bookTask = function(callback) {
        request.get('https://decouverto.fr/save/shops.json', function(err, res, body) {
            if (err) return callback(err);
            console.log('Liste des points de ventes téléchargée'.green);
            let p = path.join(folder, '/shops.json');
            fs.writeFile(p, body, function(err, data) {
                if (err) return callback(err);
                callback(null);
            });
        });
    }

    tasks.push(metaTask);
    tasks.push(bookTask);

    series(tasks, function(err) {
        if (err) {
            return report(err, 'Une erreur est survenue lors de la sauvegarde des balades');
        }
        let body = 'Les balades suivantes ont été sauvegardées:'
        files.forEach(element => {
            body += '\n - ' + element.title;
        });
        report(null, 'Sauvegarde sur replica réussie', body);
    });

});