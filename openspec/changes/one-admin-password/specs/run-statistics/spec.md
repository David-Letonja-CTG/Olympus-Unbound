## MODIFIED Requirements

### Requirement: Admin mode
The statistics screen SHALL be reached only by its address, `/admin`; no menu or screen SHALL link to it. It SHALL ask for a password and show nothing else until the right one is given; once unlocked it SHALL stay unlocked for the browser tab's session.

There SHALL be one admin password: the game server's admin token.
- In a build with a game server, the game SHALL ask the server whether the password is its admin token, and SHALL keep the password for the tab's session to set the difficulty dial (spec: difficulty-dial).
- The server SHALL compare it in constant time and SHALL limit tries per address.
- The lock SHALL say whether the password was wrong, there were too many tries, the server has no admin token, or the server could not be reached.

A build without a server (the release zip) SHALL check a hash stored in the build instead. Admin mode's statistics SHALL only read this browser's data.

#### Scenario: No way in from the menu
- **WHEN** a player looks through the main menu and every screen
- **THEN** nothing leads to the statistics screen

#### Scenario: Wrong password
- **WHEN** someone opens `/admin` and gives a password that is not the server's admin token
- **THEN** they are told it is wrong and see no statistics

#### Scenario: Right password
- **WHEN** the owner opens `/admin` and gives the server's admin token
- **THEN** the statistics screen is shown, and stays unlocked when the tab is reloaded

#### Scenario: Guessing
- **WHEN** one address tries more passwords in an hour than the limit allows
- **THEN** the server refuses further tries from it for the rest of the hour, and the lock says there were too many tries
