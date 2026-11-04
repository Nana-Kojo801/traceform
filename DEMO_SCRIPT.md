# TraceForm: 3-minute demo script

Everything shown was built during the event. Record at 1440×900 or larger. Before recording, open the sample project once, select the precomputed run, and select **Restore extracted** on any field you touched while rehearsing (or reload the demo).

---

### 0:00 to 0:20. The problem

**Screen:** dashboard.

> "Small nonprofits fill out intake and grant forms by copying facts out of emails, letters, and meeting minutes. AI can fill a form, but you can't trust it: which answers are real, which are guessed, and which quietly picked one of two contradicting numbers? TraceForm fills the form with Meta's model and accounts for every answer."

### 0:20 to 0:55. Upload and live Meta extraction

**Screen:** open **Try demo** → **Sources** tab. Show the three documents (two TXT, one real DOCX), then preview the DOCX text.

> "Here's a grant intake: an application narrative, a follow-up email as a Word file, and board minutes. Text is extracted in the browser, page- and paragraph-aware."

Select the **Form** tab briefly to show the 9 fields with types (number, date, single-select).

Select **Run live on sample documents**. The banner shows "Live extraction running".

> "This sends the documents to Meta's Muse Spark through the Responses API with schema-constrained JSON output. The model must answer every field with a verbatim quote, or say it's missing."

When it finishes (about 15 to 20 s), the banner reads "Live result from muse-spark-1.3".

### 0:55 to 1:20. Click a field and see its evidence

**Screen:** Review tab. Select **Project title**, then **Start date**.

> "Every answer is tied to its source. I click a field and the exact passage is highlighted in the document. And this check isn't the model's word: code searched the document for the quote. That's 'source match'. Whether the quote actually answers the field is 'answer validation', and that stays with a human."

Point at the two Verification boxes.

### 1:20 to 1:45. The conflict

**Screen:** select **Requested amount**.

> "The narrative asks for $48,000. A later email revises it to $54,000 for cold-storage equipment. TraceForm doesn't pick one. Both sides are shown with verified citations." Select **Show in source** on each side.

### 1:45 to 2:00. The missing field

**Screen:** select **Fiscal sponsor**.

> "No document mentions a fiscal sponsor, so the field stays blank. TraceForm never infers a fact from absence."

### 2:00 to 2:30. A fabricated citation caught and repaired

**Screen:** in the run selector, switch to **Precomputed demo** (badged "Sample dataset / precomputed demo, not live AI"). Select **Households served**.

> "This precomputed sample contains a deliberately altered quote, the kind of citation a model can fabricate. The verifier couldn't find it in the source, so the field was flagged. Then the repair pass ran: Meta's model got only that field and the failed quote, and had to re-cite verbatim or give up. It re-cited, code verified the new quote, and the field is marked 'Fixed on second pass'. The rejected quote stays visible, struck through."

Optionally mention: "We ran the same repair loop live against Meta with injected fake citations. All 3 were caught, the 2 real facts were re-cited, and the fake fiscal sponsor was withdrawn as missing. That's in EVALUATION.md."

### 2:30 to 2:50. Resolve and export

**Screen:** back to the live run. Select **Requested amount** → **Use this value** on $54,000. Approve **Organization name**. Edit a value and show the "Saving… Saved" indicator. Then select **CSV** and **JSON**, and open the CSV.

> "I resolve the conflict, approve, edit, and it all autosaves. Exports contain the reviewed values, not just the raw extraction. The JSON keeps every citation and its verification status."

### 2:50 to 3:00. What Meta's model does at each step

> "Meta's model does the reading, the extraction, and the self-repair. Deterministic code does the verifying. A person makes the final call. TraceForm: every answer, accounted for."

---

**Claims to avoid on camera:** do not call the system certified or compliant, do not say it gives legal or medical advice, and do not present the precomputed run as live.
