# TraceForm: 3-minute demo script

Everything shown was built during the event. Record at 1440×900 or larger. Before recording, make sure the sample project has no leftover review edits (use "Restore original" or "Clear this answer" on any field you touched).

Live app: https://traceform-five.vercel.app/

---

### 0:00 to 0:15. The problem

**Screen:** home page.

> "Small organizations copy facts from emails, letters and scans into intake forms. AI can fill a form, but you can't tell which answers are real, which were guessed, and which quietly picked one of two contradicting numbers. TraceForm fills the form with Meta's model and shows proof for every answer."

### 0:15 to 0:30. The sample

**Screen:** select **Open the sample**, then the **Sources** tab. Show the three documents (two text files and one Word file).

> "A fictional grant application, a follow-up email as a Word file, and board minutes."

### 0:30 to 1:05. Live Meta extraction

**Screen:** back to **Review**, press **Run live** (or R). The status pill turns black: "Reading your documents". When it finishes, the pill reads "Live result".

> "This sends the documents to Meta's Muse Spark with schema-constrained JSON output. Every field must come back with a verbatim quote, or be marked missing. Then code checks every quote against the source."

If you speed up the wait, say "sped up" on screen.

### 1:05 to 1:30. Evidence

**Screen:** select **Project title**, then **Start date**. The source pane scrolls to the highlighted sentence, and its number chip matches the one in the answer. Point at **Checks**.

> "Each answer is tied to its sentence. 'Quote found in the source' was checked by code, not by the model. The second opinion is a separate Meta call and is advisory only."

### 1:30 to 1:55. The conflict

**Screen:** select **Requested amount**. Two values: $48,000 ① and $54,000 ②. Select each source to show its sentence, then press **2** to choose $54,000, and **Approve**.

> "The application asks for $48,000, and a later email revises it to $54,000. TraceForm doesn't pick one. Both sides are shown, and a person chooses."

### 1:55 to 2:05. Blank, not guessed

**Screen:** select **Fiscal sponsor**: "Not in any source".

> "No document mentions a fiscal sponsor, so it stays blank. TraceForm never guesses."

### 2:05 to 2:30. A fabricated citation, caught and repaired

**Screen:** in the run picker under the title, choose **Sample data** (the pill reads "Sample data, not live AI"). Open **Households served**: Checks shows "Fixed on a second try" with the struck-out first quote.

> "This sample run is precomputed, and it includes a deliberately altered quote. Code couldn't find it in the source, so the field was flagged. Meta's model then got one chance to re-cite it word for word, and code verified the new quote. We also ran this live against Meta with fake citations: all three were caught."

### 2:30 to 2:45. Photos

**Screen:** open the **Site visit note** project, **Sources** tab, **Compare** view.

> "Photos and scans are read by Muse Spark vision. The text is labeled as read by Meta AI, quotes are verified against it, and you can compare it with the original."

### 2:45 to 3:00. Export and close

**Screen:** **Export**, then **CSV**.

> "Meta's model reads, extracts, repairs and gives a second opinion. Code verifies. A person decides. TraceForm: every answer, accounted for."

---

**Claims to avoid on camera:** do not call the system certified or compliant, do not say it gives legal or medical advice, and do not present the "Sample data" run as live.
