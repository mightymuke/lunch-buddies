var buddies = require("./buddies.json");

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

var people = buddies
    .reduce((acc, curr) => acc.concat(curr.buddies), [])
    .reduce((acc, curr) => {
            acc = addBuddyToPerson(acc, curr[0], curr[1]);
            acc = addBuddyToPerson(acc, curr[1], curr[0]);
            return acc;
        }, []);

console.log(JSON.stringify(people, undefined, 2));