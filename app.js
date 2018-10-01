var fs = require('fs');
var buddies = require("./buddies.json");

var candidatesFile = "./candidates.txt";

// Map lunch buddies results to list of members and their previous buddies
function getListOfPreviousPairings(buddies) {
    function addBuddyToPerson(people, person, buddy) {
        var p = people.find(x => x.name == person);
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
function getListOfPotentialMatches(candidates, previousPairings) {
    return candidates
        .reduce((acc, curr) => {
            acc.push({
                "name": curr,
                "buddies": candidates.filter(x => {
                    if (x === curr) return false;
                    var p = previousPairings.find(x => x.name == curr);
                    if (p === undefined) return true;
                    return !p.buddies.some(y => x === y);
                })
            });
            return acc;
        }, []);
}

// Potential matches are
// - created from other candidates in list, minus previously matched
// - sorted by number of potential matches (increasing)
// Pick random potential match
// Remove potential match from list, and from other peoples potential matches

var candidates = getListOfCurrentCandidates(candidatesFile);
var previousPairings = getListOfPreviousPairings(buddies);
var potentialMatches = getListOfPotentialMatches(candidates, previousPairings)
    .sort((a, b) => a.buddies.length - b.buddies.length);

var v = potentialMatches.map(x => { return { "name": x.name, "count": x.buddies.length }});
console.log(JSON.stringify(v, undefined, 2));