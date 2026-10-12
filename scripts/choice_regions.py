"""Map each original answer row to an accessible clickable image slice."""
import re

def add_choice_regions(pdf, questions):
    starts = {}
    page_lines = {}
    for page_no, page in enumerate(pdf):
        lines = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                text = ''.join(span['text'] for span in line['spans']).strip()
                x, y, _, bottom = line['bbox']
                lines.append((text, x, y, bottom))
                if x < 55 and re.fullmatch(r'\d+\.', text):
                    starts[int(text[:-1])] = (page_no, max(69, y - 4))
        page_lines[page_no] = lines
    for q in questions:
        if q['type'] != 'mcq':
            continue
        first_page, first_top = starts[q['id']]
        labels = {}
        for i, image in enumerate(q['images']):
            page_no = image['page'] - 1
            origin = int((first_top if page_no == first_page else 69) * 2)
            for text, x, y, bottom in page_lines[page_no]:
                if re.match(r'^\([A-E]\)', text):
                    top = int(y * 2) - origin
                    if 0 <= top < image['height']:
                        # Some prompts repeat A–E in their directions. Use the last set.
                        labels[text[1]] = (i, max(0, top - 3))
        assert set(labels) == set(q['choices']), (q['id'], labels)
        assert [labels[c] for c in q['choices']] == sorted(labels.values()), q['id']
        regions = []
        active_choice = None
        for i, image in enumerate(q['images']):
            cursor = 0
            boundaries = sorted((top, c) for c, (index, top) in labels.items() if index == i)
            for top, choice in boundaries:
                if top > cursor:
                    regions.append(dict(image=i, top=cursor, height=top-cursor, choice=active_choice))
                cursor, active_choice = top, choice
            if cursor < image['height']:
                regions.append(dict(image=i, top=cursor, height=image['height']-cursor, choice=active_choice))
        q['regions'] = regions

if __name__ == '__main__':
    import sys, json
    from pathlib import Path
    import pymupdf
    target = Path(__file__).resolve().parent.parent / 'questions.json'
    questions = json.loads(target.read_text())
    add_choice_regions(pymupdf.open(sys.argv[1]), questions)
    target.write_text(json.dumps(questions, ensure_ascii=False, indent=2))
    print('Mapped clickable answer content for all 183 MCQs.')
