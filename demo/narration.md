# TraceForm demo: voiceover script

The timings match `traceform-demo.mp4` (2:54). `traceform-demo-voiced.mp4` is the same video with this script read by an offline text-to-speech voice (Piper, "ryan"), as a reference or a fallback; your own voice will sound better. Each block lists the time window, what is on screen, and the line to read. At a relaxed pace (about 150 words per minute), every line fits inside its window with a little room to spare. The burned-in captions are shorter than this script; they don't need to match it word for word.

Pronunciation: "Muse Spark" (like "muse", the noun), "TraceForm" (one word, stress on "Trace").

---

### 1. Problem (0:00–0:15)
**On screen:** Home page: headline, stat cards, project cards.

> Small organizations spend hours copying facts from emails and letters into forms. AI can fill a form, but you can't tell which answers are real, which are guessed, and which quietly picked one of two numbers.

### 2. Open the sample (0:15–0:32)
**On screen:** "Open the sample", then the Sources tab with three files; the Word file is previewed.

> TraceForm fills the form with Meta's Muse Spark model, and every answer comes with proof. Here's a fictional grant intake: an application narrative, a follow-up email as a real Word file, and board minutes.

### 3. Live Meta extraction (0:32–1:02)
**On screen:** Review tab, then **R** (Run live). The black "Reading your documents…" pill appears, the wait is **sped up 4×** (real wait 24 s), then "Live result · just now".

> (0:32) I press Run live. The documents go to Muse Spark through Meta's Responses API, with schema-constrained JSON. For every field, the model must give a value and a word-for-word quote, or say it's missing.
>
> (0:45, during the sped-up part) This wait is sped up. It really took about twenty-four seconds.
>
> (0:50) Here's the live result. Every quote was then checked by code, not by the model, against the source text. Green means the quote was found. Nothing is approved until a person approves it.

### 4. Evidence (1:02–1:22)
**On screen:** "Project title", then "Start date". The source pane highlights the sentence with a numbered chip. Then the Checks list.

> Click a field and the exact sentence lights up in the document, with a matching citation number. Under Checks: code found the quote in the source, and a separate Meta call gives an advisory second opinion that the quote really answers the field.

### 5. Conflict (1:22–1:42)
**On screen:** "Requested amount": $48,000 ① and $54,000 ②. Each source is shown, then **2** chooses $54,000, then Approve.

> Requested amount: the application asks for forty-eight thousand dollars, but a later email revises it to fifty-four thousand. TraceForm doesn't pick a side. It shows both, each with its own verified quote. I choose fifty-four thousand, and approve.

### 6. Blank, not guessed (1:42–1:51)
**On screen:** "Fiscal sponsor": "Not in any source".

> Fiscal sponsor: no document mentions one, so it stays blank. Nothing is guessed.

### 7. Fake citation caught and repaired (1:51–2:11)
**On screen:** The run picker switches to **Sample data**. The pill reads "Sample data, not live AI", plus a "SAMPLE DATA · NOT LIVE AI" label. "Households served" → Checks shows "Fixed on a second try" and the fake first quote.

> Now, the Sample data run. This is not live AI: it's a hand-made fixture with one planted fake quote. Code couldn't find it, so Meta's model got one repair pass: re-cite word for word, or give up. It re-cited. In live tests, three of three fake citations were caught: two real facts re-cited, the fake one withdrawn.

### 8. Photos (2:11–2:32)
**On screen:** "‹ Projects", then "Site visit note", Sources, and the Compare view (photo next to text, "Read from a photo by Meta AI").

> Photos and scans work too. This site-visit note is a photo. Muse Spark vision read it, and the app labels it as read by Meta AI. Quotes are checked against that text, and you can compare it with the original, side by side.

### 9. Export and close (2:32–2:54)
**On screen:** Export, then CSV. The downloaded file shows requested_amount 54000, approved. Then the closing card.

> Export gives you the reviewed values as CSV or JSON. The fifty-four thousand I chose is in the file, marked approved.
>
> (2:44, as the CSV view ends) Meta's model reads, extracts, repairs, and gives a second opinion. Code verifies. A person decides. TraceForm: every answer, accounted for.

---

## Facts used (all from EVALUATION.md or visible on screen)
- Model: `muse-spark-1.3` via the Meta Model API (Responses API, schema-constrained JSON).
- Live run in this video: about 24 s from pressing Run live to the result (shown sped up 4×, labeled on screen).
- Live repair probes: 3/3 fake citations caught; the 2 real facts were re-cited verbatim, and the fake one was withdrawn.
- Optional line if you have time: across 5 live runs on these documents, 45/45 fields were correct, with 0 invented values; the conflict was flagged 5/5 and the missing field left blank 5/5.
- Don't call it certified or compliant, and don't present the Sample data run as live AI.
