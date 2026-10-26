## MODIFIED Requirements

### Requirement: The admin page sets the dial
The hidden admin page SHALL show the dial as the server has it, with a field for each value and its range. It SHALL save the dial with the admin password the page was unlocked with (spec: run-statistics / admin mode), asking for no other password. The page SHALL say whether the dial was saved for everyone, the password was refused, the server has no admin token, or the server could not be reached. A build without a server SHALL say the dial cannot be set from it.

#### Scenario: Saving
- **WHEN** the admin, unlocked with the server's admin token, changes realm growth to 1.3 and saves
- **THEN** the page says it is saved for everyone, and the next run any player starts uses it
