# GeoGuesser Country Mode

Street View style country guessing game with a mini-map overlay, timer, and progressive clues.

## Run

1. Open `/Users/joey.summers/Documents/New project 2/geoguesser/index.html` in a browser.
2. Explore the Street View scene.
3. Use `Reveal Clue` if needed (each extra clue adds a score penalty).
4. Click your guess on the mini-map and press `GUESS`.
5. The next round auto-loads.

## What improved

- 45-second round timer with auto-submit behavior.
- Clue penalty system so hints trade score for accuracy.
- Better mini-map controls (`Recenter`, `Clear Pin`).
- Round progress bar in the bottom dock.
- Cleaner status and round transitions.

## Notes

- The top-right HUD shows round, score, and timer.
- Country name is still hidden until after guess or timeout.
- Street View panel uses Google Street View embed-style URLs and may vary by browser.
