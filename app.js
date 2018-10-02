const fs = require('fs');
const buddies = require("./buddies.json");

const candidatesFile = process.argv[2];
if (!candidatesFile) {
    console.error('ERROR: Please provide a filename for the list of candidates');
    process.exit(1);
}

// Map lunch buddies results to list of members and their previous buddies
function getListOfPreviousPairings(buddies) {
    function addBuddyToPerson(people, person, buddy) {
        let p = people.find(x => x.name == person);
        if (p === undefined) {
            p = {
                "name": person,
                "buddies": []
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

// Read candidates from plain text file, one name per line
function getListOfCurrentCandidates(filename) {
    return fs.readFileSync(filename, 'utf8').toString().split("\n").filter(n => n);
}

// Create list from candidates including pairings with all other candidates minus previous pairings
function getListOfPotentialPairings(candidates, previousPairings) {
    return candidates
        .reduce((acc, curr) => {
            acc.push({
                "name": curr,
                "buddies": candidates.filter(x => {
                    if (x === curr) return false;
                    const p = previousPairings.find(x => x.name == curr);
                    if (p === undefined) return true;
                    return !p.buddies.some(y => x === y);
                })
            });
            return acc;
        }, []);
}

function selectRandomPairings(potentialPairings) {
    // For now, if there is an odd number, exclude the author
    let initialPairings = potentialPairings.length % 2 === 0
        ? []
        : [{
            "name": "Marcus Bristol",
            "buddy": "himself"
        }];

    return potentialPairings.reduce((acc, curr) => {
        // Ignore if already paired
        if (acc.some(x => curr.name === x.name || curr.name === x.buddy)) return acc;
        // Filter current pairings from list of potentials
        const potentials = curr.buddies.filter(x => !acc.some(y => x === y.name || x === y.buddy));
        // Select random buddy
        const buddy = potentials[Math.floor(Math.random() * potentials.length)];
        acc.push({
            "name": curr.name,
            "buddy": buddy
        });
        return acc;
    }, initialPairings);
}

function displayPairings(pairings) {
    console.log('@here Congratulations everyone!');
    console.log('');
    pairings.forEach(pair => {
        console.log(`${pair.name} is having lunch with ${pair.buddy} this fortnight!`);
    });
    console.log('');
    console.log('Remember, you have two weeks to complete your lunch buddy task (before the next draw). It doesn’t have to be lunch - other options are coffee, gym session, run, romantic walk around the park, etc. Its completely up to you - just get together sometime and have a chat.');
}

// Potential pairings are
// - created from other candidates in list, minus previously paired
// - sorted by number of potential pairings (increasing)
// Pick random potential pair, excluding anyone already paired

const candidates = getListOfCurrentCandidates(candidatesFile);
const previousPairings = getListOfPreviousPairings(buddies);
const potentialPairings = getListOfPotentialPairings(candidates, previousPairings)
    .sort((a, b) => a.buddies.length - b.buddies.length);
const pairings = selectRandomPairings(potentialPairings);

displayPairings(pairings);
