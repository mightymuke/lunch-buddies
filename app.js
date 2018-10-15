const fs = require('fs');
const rl = require('readline');
const buddyFile = './buddies.json';
const buddies = require(buddyFile);

// Ask a question and return the answer in a promise
function ask(question) {
    let r = rl.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    return new Promise((resolve, error) => {
        r.question(question, answer => {
            r.close();
            resolve(answer);
        });
    })
};

// Read current players from plain text file, one name per line
function getListOfCurrentCandidates(filename) {
    return fs.readFileSync(filename, 'utf8').toString().split('\n').filter(n => n);
}

// Create a list of all people who have played, each containing a list of people they've previous paired with
// - take the provided list of previous players (from the buddies file)
// - remap it from list of pairs per date, to list of buddies per player
function getListOfPreviousPairings(buddies) {
    function addBuddyToPerson(people, person, buddy) {
        let p = people.find(x => x.name == person);
        if (p === undefined) {
            p = {
                'name': person,
                'buddies': []
            };
            people.push(p);
        }
        p.buddies.push(buddy);
        return people;
    }

    return buddies
        .reduce((acc, curr) => acc.concat(curr.buddies), [])
        .reduce((acc, curr) => {
            acc = addBuddyToPerson(acc, curr[0], curr[1]);
            acc = addBuddyToPerson(acc, curr[1], curr[0]);
            return acc;
        }, []);
}

// Create a list of players, each containing a list of people they haven't yet paired with
// - candidates is current list of players
// - previousPairings is a list of all previous players, with the people they paired with
// - so, for each candidate, create a list of every other candidate filtering out any previously paired with
function getListOfPotentialPairings(candidates, previousPairings) {
    return candidates
        .reduce((acc, curr) => {
            acc.push({
                'name': curr,
                'times_played': previousPairings.filter(x => curr == x.name || x.buddies.some(y => curr == y)).length,
                'buddies': candidates.filter(x => {
                    if (x === curr) return false;
                    const p = previousPairings.find(x => x.name == curr);
                    if (p === undefined) return true;
                    return !p.buddies.some(y => x === y);
                })
            });
            return acc;
        }, []);
}

// From list of players and their potential buddies, select a random buddy
// - sort list by length of buddies, to give higher weighting to those who have fewer buddies to choose from
// - for each candidate, remove any buddies already paired this round then select a random buddy from the remaining list
function selectRandomPairings(potentialPairings) {
    // For now, if there is an odd number, exclude the author
    let initialPairings = potentialPairings.length % 2 === 0
        ? []
        : [{
            'name': 'Marcus Bristol',
            'buddy': 'himself'
        }];

    return potentialPairings
        .sort((a, b) => a.buddies.length - b.buddies.length)
        .reduce((acc, curr) => {
            // Ignore if already paired
            if (acc.some(x => curr.name === x.name || curr.name === x.buddy)) return acc;
            // Filter current pairings from list of potentials
            const potentials = curr.buddies.filter(x => !acc.some(y => x === y.name || x === y.buddy));
            // Select random buddy
            const buddy = potentials[Math.floor(Math.random() * potentials.length)];
            acc.push({
                'name': curr.name,
                'buddy': buddy
            });
            return acc;
        }, initialPairings);
}

// Display the new list of pairings
// - this is a very specific format that can be copied and pasted into slack
//   one day we might consider templates
//   probably not
function displayPairings(pairings, potentialPairings) {
    const firstTimers = potentialPairings.reduce((acc, curr) => {
        if (curr.times_played == 0) {
            acc.push(curr.name);
        }
        return acc;
    }, []);

    console.log('');
    console.log('@here Congratulations everyone!');
    console.log('');
    console.log(`Firstly, a warm welcome to our new buddies:\n- ${firstTimers.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'})).join('\n- ')}`);
    console.log('');
    console.log('Now - lets see who we\'re having lunch with:');
    pairings.forEach(pair => {
        console.log(`- ${pair.name} is having lunch with ${pair.buddy} this fortnight!`);
    });
    console.log('');
    console.log('Remember, you have two weeks to complete your lunch buddy task (before the next draw). It doesn’t have to be lunch - other options are coffee, gym session, run, romantic walk around the park, etc. Its completely up to you - just get together sometime and have a chat.');
    console.log('');
}

// Gets pairings and asks user to confirm them (max 3 tries)
function getConfirmedPairings(potentialPairings, counter) {
    counter = counter || 0;
    if (counter >= 3) {
        throw new Error('Unable to determine pairings - there must be a problem with the algorithm');
    }

    return new Promise((resolve) => {
        let pairings = selectRandomPairings(potentialPairings);
        displayPairings(pairings, potentialPairings);
        // Sometimes we don't have valid matchings. Should we run again, or just pair the invalid ones?
        if (pairings.some(x => x.buddy === 'undefined')) {
            console.log('*** WARNING - Failed matchings! ***\n')
        }

        ask('Are these results ok? (Y/N): ')
            .then((answer) => {
                const a = answer.trim().toLowerCase();
                resolve((a === 'y' || a === 'yes') ? pairings : false);
            });
    })
    .then((pairings) => {
        return pairings ? pairings : getConfirmedPairings(potentialPairings, counter + 1);
    });
}

// Adds newPairings to buddies and saves it to the buddies file
function saveNewPairings(buddies, newPairings) {
    if (!newPairings) return;
    buddies = buddies || []

    buddies.push({
        'date-utc': new Date().toISOString(),
        'buddies': newPairings
    });

    fs.writeFile(buddyFile, JSON.stringify(buddies, undefined, 2), 'utf8', function(err){
        if (err) console.log(err);
      })
}

// Potential pairings are
// - created from other candidates in list, minus previously paired
// - sorted by number of potential pairings (increasing)
// Pick random potential pair, excluding anyone already paired

const candidatesFile = process.argv[2];
if (!candidatesFile) {
    console.error('ERROR: Please provide a filename for the list of candidates');
    process.exit(1);
}

const candidates = getListOfCurrentCandidates(candidatesFile);
const previousPairings = getListOfPreviousPairings(buddies);
const potentialPairings = getListOfPotentialPairings(candidates, previousPairings);

getConfirmedPairings(potentialPairings)
    .then((pairings) => saveNewPairings(buddies, pairings))
    .catch((err) => console.log(err.message));
