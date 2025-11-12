# Test PDF Files with Verification Codes

Each PDF contains a unique verification code that can be used to confirm end-to-end processing by AI models.

## Verification Codes

| File | Size | Verification Code | Purpose |
|------|------|-------------------|---------|
| small.pdf | 33KB | **SMALL-7X9Q2** | Baseline small file test |
| medium.pdf | 813KB | **MEDIUM-K4P8R** | Medium-sized file test |
| large.pdf | 3.4MB | **LARGE-M9N3T** | Large file test |
| xlarge.pdf | 11MB | **XLARGE-W6H5V** | Extra-large file test |

## Usage

When testing PDF upload to AI services, ask the AI to extract the verification code from the PDF. A successful response should include the exact code listed above for that file.

## Example Test Prompt

```
What is the verification code shown in this PDF?
```

**Expected responses:**
- For small.pdf: "SMALL-7X9Q2"
- For medium.pdf: "MEDIUM-K4P8R"  
- For large.pdf: "LARGE-M9N3T"
- For xlarge.pdf: "XLARGE-W6H5V"

If the AI returns the correct code, this confirms:
1. The PDF was successfully uploaded
2. The PDF was processed/parsed by the AI
3. The AI extracted and understood the text content

## PDF Details

All PDFs are structurally valid:
- Validated with `qpdf --check`
- PDF versions 1.3-1.4
- Contain both text overlays and image content
- Increasing file sizes for payload testing

## Verification Code Format

Codes follow the pattern: `{SIZE}-{5-CHAR-RANDOM}`
- SIZE: SMALL, MEDIUM, LARGE, or XLARGE
- Random component ensures uniqueness and prevents guessing
