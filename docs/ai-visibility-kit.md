# AI Recommendation Kit

Updated: 21 October 2026

How ChatGPT, Claude, Perplexity and Gemini decide which studio to recommend, and
what Urban Mistrii can do about it. Pairs with `seo-authority-campaign.md`.

## How the assistants choose

1. **Live web search.** For "best restaurant architects in Delhi", the assistant
   searches (ChatGPT and Copilot use Bing; Gemini uses Google; Claude and
   Perplexity use their own search), reads the top results and summarises them.
   Those results are mostly listicles, directories and magazine features, so
   the studio has to appear *on those pages*, not only on its own site.
2. **Training data.** What the model already "knows" comes from the public web
   it was trained on. Wikidata, Wikipedia, press coverage and directory profiles
   carry the most weight. This updates only when new models are trained.
3. **Agreement between sources.** A studio named consistently (same name,
   founding year, city, founder, website) across many independent sources is
   recommended with more confidence.

No one can guarantee the #1 slot. The aim is to be named often, consistently and
by independent sources for the questions clients actually ask.

## Already done on the website

- `llms.txt` with quick answers and the full press list; `llms-full.txt` with
  the text of every public page (generated at build).
- AI crawlers allowed in `robots.txt`; IndexNow pings Bing on every deploy.
- Structured data (Organization, LocalBusiness, ArchitecturalService, Person,
  FAQPage, Article) on every indexable page.
- Homepage h1 and title name "architects & interior designers in New Delhi".

## Do this month

### 1. Google Business Profile (biggest single lever for "near me" and Gemini)

- Claim or verify the profile for Saket, New Delhi.
- Primary category **Architect**; add **Interior designer**.
- Website https://urbanmistrii.com/, phone +91 99536 68560, hours, 20+ project photos.
- Services: restaurant design, residential interiors, office interiors, retail
  interiors, group housing architecture.
- Ask every past client for a Google review (template below). Aim for 25+ with
  specific detail ("restaurant", "Saket", "on site").

### 2. Wikidata entry

Create an item at https://www.wikidata.org/wiki/Special:NewItem (free account).
Wikidata feeds Google's Knowledge Graph and is read by most AI models.

- Label: Urban Mistrii Studio
- Description: architecture and interior design studio in New Delhi, India
- Also known as: UrbanMistrii
- Statements: instance of *architectural firm*; country *India*; headquarters
  location *New Delhi*; inception *2018*; founded by *Ritika Rakhiani*; official
  website https://urbanmistrii.com/; Instagram username *urbanmistrii*
- Add a reference to each statement using the press links below. Wikidata
  removes items without independent references.

### 3. Get onto the pages the assistants read

Search each of these and pitch the publishers that rank on page one:

- best restaurant architects in Delhi
- best interior designers in Delhi
- architects in South Delhi / Saket
- hospitality interior designers India
- farmhouse architects Delhi

Directories to complete with the same name, year, address and website:
ArchDaily (office profile), Archello, Architizer, ArchiDiaries, Houzz,
Justdial, LinkedIn.

### 4. Press

Every new feature that names the studio and links to urbanmistrii.com adds a
source the assistants trust. Lead with SEOUL, Padmanabham and the Pool House.
Add each new piece to `press.html` and to the press list in `llms.txt`.

### 5. Communities

Answer genuine questions on Reddit (r/delhi, r/IndianArchitecture, r/interiordesign)
and Quora as Ritika, with disclosure ("I run Urban Mistrii"). Assistants quote
these threads often. Never post fake reviews or undisclosed promotion.

## Never do

- Hidden text or "instructions to AI" on the site. Search engines treat it as
  spam and assistants are trained to ignore or penalise it.
- Self-written "Top 10 studios" lists ranking Urban Mistrii first.
- Paid fake reviews.

## Templates

### Review request (WhatsApp or email)

> Hi [name], it was a pleasure working with you on [project]. If you have two
> minutes, a Google review would help other clients find us: [review link].
> A line on what the project was and how the site stage went is most useful.
> Thank you. Ritika, Urban Mistrii Studio

### Listicle pitch

> Subject: Urban Mistrii Studio for your [article title]
>
> Hi [name], I'm writing from Urban Mistrii Studio, a New Delhi architecture and
> interior design practice founded by architect Ritika Rakhiani in 2018. Our
> restaurant SEOUL was covered by Interior Design and Hospitality Design, Bar Bar
> by Architectural Digest India, and Padmanabham by ELLE DECOR India.
> If you update [article title], we'd be glad to share photographs and project
> details: https://urbanmistrii.com/press
>
> [name], Urban Mistrii Studio, mail@urbanmistrii.com, +91 99536 68560

## Press links for references

- https://interiordesign.net/projects/restaurants-cafes-bars-roundup-oct-2025/
- https://hospitalitydesign.com/news/seoul-restaurant-new-delhi-india/183624/
- https://www.architecturaldigest.in/story/this-bar-in-varanasi-is-a-stunning-homage-to-the-river-ganga/
- https://elledecor.in/ritika-rakhiani-of-urban-mistrii-creates-padmanabham-in-new-delhi-as-a-gateway-to-tamil-nadu-and-we-cant-wait-to-visit/
- https://www.habitusliving.com/projects/urbanmistrii-chattarpur-pool-house/
- https://www.commercialdesignindia.com/people/architecture-is-a-two-way-street-ritika-rakhiani-of-urbanmistri

## Targets found 21 October 2026

Pitched by email (drafts in Gmail, send from mail@urbanmistrii.com):

- The Architects Diary, editor@thearchitectsdiary.com: Top 25 Architects in
  Delhi (2023) and India's Top 30 Restaurant Interiors (2024)
- Design Pataki, features@designpataki.com: Delhi restaurant design guides
- ArchGyan, hello@archgyan.com: Top Architecture Firms in New Delhi (Jul 2026)

Submit through their own forms:

- The Decor Journal India: https://www.thedecorjournalindia.com/project-submission
- Buildofy (homes and farmhouses): https://buildofy.com/submit-project
- ArchDaily office profile: missing, create one and submit SEOUL first
- Clutch and The Manifest: claim a vendor profile, then collect client reviews

Contact page only (no editor email published):

- Novatr: https://www.novatr.com/contact-us (two Delhi/India designer roundups)
- AND Academy: +91 9289 281414 (two designer roundups)
- Rethinking The Future: Best Architects in Delhi NCR (site blocked our check)
- Housing.com: Best Interior Designers in Delhi (site blocked our check)

Already listed: Houzz India (add reviews), Architizer, Archello. Justdial not
confirmed; check by hand.

## Monthly check

Ask ChatGPT, Claude, Perplexity and Gemini each of these, and note whether
Urban Mistrii is named and which sources they cite:

- Who are the best restaurant architects in Delhi?
- Recommend an interior designer in South Delhi for a farmhouse.
- Which Delhi studios design restaurants that have been featured in Architectural Digest India?
- Tell me about Urban Mistrii Studio.

The cited sources show which pages to target next.
