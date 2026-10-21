## MODIFIED Requirements

### Requirement: Sharing a run

Every run summary SHALL offer **Share picture** and **Share link**. The picture SHALL dare friends to beat the result. It SHALL show:

- the game's name;
- a headline naming the player when they have one ("Ada challenges you"), else a nameless dare;
- the trial's date and twist, or "Quick run";
- the god in front of the realm's boss;
- time, kills, level and realms;
- the score as **Score to beat**;
- a closing line saying where to play.

**Share picture** SHALL open the device's share sheet with the picture alone, so apps that drop pictures sent with text keep it; where files cannot be shared it SHALL save the picture. **Share link** SHALL share the dare and the challenge link through the share sheet, or copy them where there is none. Each SHALL say what happened.

#### Scenario: Sharing on a phone

- **WHEN** the player taps Share picture on a phone that can share files
- **THEN** the share sheet opens with the picture and nothing else
- **WHEN** they then tap Share link
- **THEN** the share sheet opens with the dare and the challenge link

#### Scenario: Sharing on a computer

- **WHEN** the browser cannot share files and has no share sheet
- **THEN** Share picture downloads the picture and Share link copies the challenge link, and the summary says so each time

#### Scenario: A named dare

- **WHEN** a player named Ada shares a run that scored 5,100
- **THEN** the picture reads "Ada challenges you" and shows 5,100 as the score to beat

### Requirement: Link preview

The site SHALL describe itself to link previews: a title, a description and a 1200 × 630 picture of the game, so that a shared link shows a card in chat apps and social sites. Every address the game shares (challenge links, room invites, the Daily Trial) SHALL answer as a page of its own, not as a "not found" page, so that its preview shows too.

#### Scenario: Pasting the link

- **WHEN** the game's address is pasted into a chat app that shows previews
- **THEN** the preview shows "Olympus Unbound", the tagline and the game's picture

#### Scenario: Pasting a challenge link

- **WHEN** a challenge link or a room invite is pasted into a chat app that shows previews
- **THEN** it shows the same preview, and opening it still starts the challenge or the invite
