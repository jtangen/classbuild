#!/usr/bin/env python3
"""Replace the two problematic widgets in leadership ch05 with non-fake-grading versions."""

FILE = "output/leadership-through-crisis/chapters/05_speaking-into-the-void.html"

with open(FILE, "r") as f:
    html = f.read()

# ── 1. Replace Widget 1 container HTML ──────────────────────────────────────

old_container1 = '''    <div class="widget-container" id="widget-drafting-room">
      <h3 style="margin-top:0;">\U0001f58a\ufe0f Crisis Statement Drafting Room</h3>
      <p style="font-size:0.9rem;color:var(--text-secondary);">You are the communications lead. Draft a public statement (max 150 words) based on the scenario below. Reference the examples for guidance \u2014 but do not copy them. You have three attempts.</p>
      <div id="dr-content">Loading widget...</div>
    </div>'''

new_container1 = '''    <div class="widget-container" id="widget-drafting-room">
      <h3 style="margin-top:0;">\U0001f52c Crisis Statement Autopsy</h3>
      <p style="font-size:0.9rem;color:var(--text-secondary);">Four organisations have just released crisis statements. For each, diagnose how well it handles the five critical dimensions of crisis communication. Then compare your assessment with expert analysis.</p>
      <div id="dr-content">Loading widget...</div>
    </div>'''

assert old_container1 in html, "Could not find Widget 1 container HTML"
html = html.replace(old_container1, new_container1)

# ── 2. Replace Widget 3 container HTML ──────────────────────────────────────

old_container3 = '''    <div class="widget-container" id="widget-splitter">
      <h3 style="margin-top:0;">\U0001f500 Internal vs. External Message Splitter</h3>
      <p style="font-size:0.9rem;color:var(--text-secondary);">You\'ve received a crisis update. Draft two versions of the same message: one for your internal team, one for the public. After submitting, see how well each message is calibrated for its audience \u2014 and whether the two would survive being seen together.</p>
      <div id="sp-content">Loading widget...</div>
    </div>'''

new_container3 = '''    <div class="widget-container" id="widget-splitter">
      <h3 style="margin-top:0;">\U0001f500 Message Leak Test</h3>
      <p style="font-size:0.9rem;color:var(--text-secondary);">In a crisis, your internal and external messages will often end up side by side \u2014 through leaks, FOI requests, or legal discovery. Read each pair below and decide: if both messages became public simultaneously, would they survive the scrutiny?</p>
      <div id="sp-content">Loading widget...</div>
    </div>'''

assert old_container3 in html, "Could not find Widget 3 container HTML"
html = html.replace(old_container3, new_container3)

# ── 3. Replace Widget 1 script block ────────────────────────────────────────
# Use string find/splice instead of regex to avoid escape issues

marker1_start = "  <!-- Widget 1: Crisis Statement Drafting Room -->\n  <script>\n"
marker1_end_before = "\n\n  <!-- Widget 2: Trust Erosion Simulator -->"

idx1_start = html.index(marker1_start)
idx1_content_start = idx1_start + len(marker1_start)

# Find the </script> that comes before Widget 2
idx1_widget2 = html.index(marker1_end_before)
# Search backwards from Widget 2 marker to find </script>
idx1_script_end = html.rindex("</script>", idx1_content_start, idx1_widget2)

NEW_WIDGET1_JS = r"""(function() {
    try {
      var container = document.getElementById('dr-content');
      var statements = [
        {
          label: 'Statement A \u2014 Industrial Fire',
          context: 'A chemical plant explosion injured 3 workers and killed 1. Cause unknown. Media reporting inaccurately.',
          text: 'We are aware of the incident at our facility and are working closely with the relevant authorities. We take safety extremely seriously and have robust protocols in place. We will provide further information in due course.',
          expert: [
            { dim: 'Empathy', rating: 'missing', note: 'No mention of the injured or deceased. No human acknowledgment at all.' },
            { dim: 'Transparency', rating: 'missing', note: '"Aware of the incident" tells the audience nothing they don\'t already know. No facts shared.' },
            { dim: 'Credibility', rating: 'weak', note: '"Robust protocols" after a fatal explosion invites scepticism. Claiming strength in the moment of failure is a credibility risk.' },
            { dim: 'Actionability', rating: 'missing', note: 'No guidance. Residents near the plant don\'t know whether to stay indoors, evacuate, or call a number.' },
            { dim: 'Legal Safety', rating: 'present', note: 'No admissions or promises. But this is safety through saying nothing \u2014 legally safe, communicatively useless.' }
          ]
        },
        {
          label: 'Statement B \u2014 Data Breach',
          context: '340,000 customer records accessed by unauthorised actor. Payment data encrypted. Breach occurred 9 days ago, discovered today.',
          text: 'We are heartbroken that our customers\' trust has been violated. We guarantee that no financial data has been compromised and there is absolutely no risk to your payment information. We are sorry this happened and promise it will never happen again. Our team is working around the clock to fix this.',
          expert: [
            { dim: 'Empathy', rating: 'present', note: '"Heartbroken" and "sorry" show emotional engagement. A strong opening.' },
            { dim: 'Transparency', rating: 'missing', note: 'Doesn\'t say how many records, when it happened, or what data was accessed. Omits the 9-day detection gap entirely.' },
            { dim: 'Credibility', rating: 'missing', note: '"Guarantee," "absolutely no risk," and "never happen again" are promises that cannot be made this early. If any payment data turns out to be compromised, this statement becomes a liability.' },
            { dim: 'Actionability', rating: 'missing', note: 'No guidance for customers \u2014 should they change passwords? Monitor accounts? Call a support line?' },
            { dim: 'Legal Safety', rating: 'missing', note: '"Guarantee" and "never happen again" create legal exposure. "No risk" may be contradicted by the ongoing forensic investigation.' }
          ]
        },
        {
          label: 'Statement C \u2014 Transport Accident',
          context: 'A commuter train derailed at 6:40 a.m. injuring 23 passengers, 4 critically. Track maintenance records are under scrutiny.',
          text: 'At 6:40 a.m. today, a commuter service derailed between Westfield and Oakridge stations. Twenty-three passengers have been transported to three area hospitals; four are in critical condition. The cause has not been determined. A safety investigation is underway and we will not speculate on contributing factors until that work is complete. Services on the affected line are suspended. Passengers should use replacement bus services operating from Westfield station. Our next update will be at 11:00 a.m.',
          expert: [
            { dim: 'Empathy', rating: 'weak', note: 'Factually complete but emotionally cold. No acknowledgment of what passengers and families are going through. The injured are referenced as statistics, not people.' },
            { dim: 'Transparency', rating: 'present', note: 'Strong. Specific time, location, numbers, and honest admission of unknowns. Commits to a next update time.' },
            { dim: 'Credibility', rating: 'present', note: '"Will not speculate" builds trust. No over-promising. Facts are verifiable.' },
            { dim: 'Actionability', rating: 'present', note: 'Clear guidance: replacement buses from Westfield, services suspended on that line.' },
            { dim: 'Legal Safety', rating: 'present', note: 'No admissions about maintenance. Investigation referenced without pre-judgement.' }
          ]
        },
        {
          label: 'Statement D \u2014 Workplace Fatality',
          context: 'A scaffolding collapse at a construction site has killed one subcontractor worker and injured another. Family not yet notified.',
          text: 'We are devastated to confirm that a member of our extended site team lost their life in a scaffolding incident at our River Street site this morning. Our hearts go out to their family and colleagues. Emergency services responded within minutes. The site is closed and a full investigation is underway \u2014 we do not yet know what caused this and we will not speculate. A second worker was injured and is receiving hospital treatment; their injuries are not life-threatening. We have activated our support services for all site personnel. We will provide a further update by 2:00 p.m. today. Media enquiries: 0800-555-0199. If you were near the site and have concerns, please contact our dedicated line: 0800-555-0200.',
          expert: [
            { dim: 'Empathy', rating: 'present', note: '"Devastated," "hearts go out," "member of our extended site team" \u2014 treats the deceased as a person, not a liability.' },
            { dim: 'Transparency', rating: 'present', note: 'Shares what is known (location, one fatality, one injury), admits what is not known (cause), commits to next update at 2:00 p.m.' },
            { dim: 'Credibility', rating: 'present', note: '"Will not speculate" avoids over-promising. Investigation referenced. No defensive language about safety record.' },
            { dim: 'Actionability', rating: 'present', note: 'Two phone numbers provided. Support services activated. Clear next-update time.' },
            { dim: 'Legal Safety', rating: 'present', note: 'Notes "extended site team" (acknowledges without accepting employer liability for subcontractor). No cause speculation. Does not name the deceased (family not yet notified).' }
          ]
        }
      ];

      var ratings = {};
      var dims = ['Empathy','Transparency','Credibility','Actionability','Legal Safety'];
      var submitted = false;

      function render() {
        var html = '';
        html += '<p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:1rem;">Read each crisis statement and assess how well it handles five critical dimensions. Rate each as <strong style="color:var(--success);">Present</strong>, <strong style="color:var(--warm);">Weak</strong>, or <strong style="color:#991b1b;">Missing</strong>. Then compare with the expert analysis.</p>';

        statements.forEach(function(s, si) {
          html += '<div style="background:var(--elevated);border-radius:8px;padding:1rem;margin-bottom:1rem;">';
          html += '<strong style="color:var(--accent);font-size:0.9rem;">' + s.label + '</strong>';
          html += '<p style="font-size:0.8rem;color:var(--text-muted);margin:0.25rem 0 0.5rem;font-style:italic;">Context: ' + s.context + '</p>';
          html += '<div style="background:var(--surface);border-radius:6px;padding:0.75rem;border-left:3px solid var(--accent);margin-bottom:0.75rem;">';
          html += '<p style="font-size:0.88rem;margin:0;line-height:1.5;">\u201c' + s.text + '\u201d</p>';
          html += '</div>';

          html += '<div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:0.4rem;">';
          dims.forEach(function(d, di) {
            var key = si + '-' + di;
            var cur = ratings[key] || '';
            html += '<div style="text-align:center;">';
            html += '<div style="font-size:0.72rem;font-weight:600;margin-bottom:0.3rem;color:var(--text-secondary);">' + d + '</div>';
            var opts = [
              { val: 'present', label: '\u2713', color: 'var(--success)' },
              { val: 'weak', label: '\u26A0', color: 'var(--warm)' },
              { val: 'missing', label: '\u2717', color: '#991b1b' }
            ];
            html += '<div style="display:flex;gap:2px;justify-content:center;">';
            opts.forEach(function(o) {
              var sel = cur === o.val;
              html += '<button data-key="' + key + '" data-val="' + o.val + '" class="dr-rate-btn" style="width:28px;height:28px;border-radius:4px;border:1px solid ' + (sel ? o.color : '#1e3a5f30') + ';background:' + (sel ? o.color + '20' : 'transparent') + ';color:' + o.color + ';font-size:0.85rem;cursor:pointer;padding:0;line-height:1;"' + (submitted ? ' disabled' : '') + '>' + o.label + '</button>';
            });
            html += '</div></div>';
          });
          html += '</div>';

          if (submitted) {
            html += '<div style="margin-top:0.75rem;border-top:1px solid #1e3a5f15;padding-top:0.75rem;">';
            html += '<strong style="font-size:0.8rem;color:var(--accent);">Expert Analysis:</strong>';
            s.expert.forEach(function(e, ei) {
              var key = si + '-' + ei;
              var userRating = ratings[key] || 'none';
              var match = userRating === e.rating;
              var icon = e.rating === 'present' ? '\u2713' : e.rating === 'weak' ? '\u26A0' : '\u2717';
              var clr = e.rating === 'present' ? 'var(--success)' : e.rating === 'weak' ? 'var(--warm)' : '#991b1b';
              var matchIcon = match ? ' <span style="color:var(--success);font-size:0.75rem;">(you agreed)</span>' : ' <span style="color:var(--text-muted);font-size:0.75rem;">(you said ' + (userRating === 'none' ? 'not rated' : userRating) + ')</span>';
              html += '<p style="font-size:0.82rem;margin:0.3rem 0;color:var(--text-secondary);"><span style="color:' + clr + ';font-weight:700;">' + icon + ' ' + e.dim + '</span>' + matchIcon + ' \u2014 ' + e.note + '</p>';
            });
            html += '</div>';
          }

          html += '</div>';
        });

        if (!submitted) {
          var totalRated = 0;
          for (var k in ratings) { if (ratings.hasOwnProperty(k)) totalRated++; }
          var total = statements.length * dims.length;
          html += '<div style="text-align:center;margin-top:0.5rem;">';
          html += '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">' + totalRated + ' of ' + total + ' dimensions rated</p>';
          html += '<button id="dr-submit"' + (totalRated < total ? ' disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '>See Expert Analysis</button>';
          html += '</div>';
        } else {
          var correct = 0;
          var total = statements.length * dims.length;
          statements.forEach(function(s, si) {
            s.expert.forEach(function(e, ei) {
              if (ratings[si + '-' + ei] === e.rating) correct++;
            });
          });
          html += '<div style="text-align:center;margin-top:1rem;padding:1rem;background:var(--elevated);border-radius:8px;">';
          html += '<strong style="color:var(--accent);">Your diagnostic accuracy: ' + correct + ' / ' + total + '</strong>';
          html += '<p style="font-size:0.85rem;color:var(--text-secondary);margin:0.3rem 0 0;">The ability to quickly diagnose what a crisis statement does well and where it fails is one of the most important skills in crisis communication leadership.</p>';
          html += '</div>';
        }

        container.innerHTML = html;

        if (!submitted) {
          var btns = container.querySelectorAll('.dr-rate-btn');
          for (var i = 0; i < btns.length; i++) {
            (function(b) {
              b.addEventListener('click', function() {
                ratings[b.getAttribute('data-key')] = b.getAttribute('data-val');
                render();
              });
            })(btns[i]);
          }
          var sub = document.getElementById('dr-submit');
          if (sub && !sub.disabled) {
            sub.addEventListener('click', function() {
              submitted = true;
              render();
            });
          }
        }
      }

      render();
    } catch(e) {
      document.getElementById('dr-content').innerHTML = '<p style="color:var(--text-secondary);font-style:italic;">Interactive widget could not load. The Crisis Statement Autopsy presents four crisis statements for you to evaluate across five dimensions: empathy, transparency, credibility, actionability, and legal safety.</p>';
    }
  })();"""

html = html[:idx1_content_start] + NEW_WIDGET1_JS + "\n  " + html[idx1_script_end:]

print("Replaced Widget 1 script block")

# ── 4. Replace Widget 3 script block ────────────────────────────────────────

marker3_start = "  <!-- Widget 3: Internal vs External Message Splitter -->\n  <script>\n"

idx3_start = html.index(marker3_start)
idx3_content_start = idx3_start + len(marker3_start)

# Find the last </script> in the file (Widget 3 is the last script block)
idx3_script_end = html.rindex("</script>")

NEW_WIDGET3_JS = r"""(function() {
    try {
      var container = document.getElementById('sp-content');
      var pairs = [
        {
          title: 'Scenario 1: Product Contamination',
          internal: 'URGENT \u2014 ALL STAFF. A batch of AllerSafe bars shipped last Tuesday contains undeclared peanut traces. This is a serious safety issue. Do NOT downplay it to anyone. If customers call, tell them: stop eating the product, full refund, no questions asked. Marketing: pull all social posts featuring AllerSafe immediately. Recall logistics meeting at 2 p.m., Room 4B. Jessica Chen is incident lead. Questions go to her, not to the press.',
          external: 'We can confirm that a limited number of AllerSafe bars may contain traces of peanut not listed on the label. We are treating this as a routine quality check and the risk to consumers is very low. We are working with retailers to remove affected stock. Customers who have purchased AllerSafe bars recently should check the batch number on our website.',
          issue: 'severity-mismatch',
          options: [
            { val: 'coherent', label: 'These messages are coherent' },
            { val: 'severity-mismatch', label: 'Internal calls it "serious" while external calls it "routine"' },
            { val: 'detail-gap', label: 'External shares too much operational detail' },
            { val: 'tone-gap', label: 'Internal message is too emotional for staff' }
          ],
          explanation: 'The internal message correctly calls this a "serious safety issue" \u2014 but the external statement frames it as a "routine quality check" with "very low" risk. If the internal email leaks (and they frequently do), the public sees an organisation that knows it has a serious problem but chose to minimise it publicly. This is the classic coherence gap that destroys trust.'
        },
        {
          title: 'Scenario 2: Workplace Fatality',
          internal: 'Team \u2014 I\'m writing with terrible news. A scaffolding collapse at River Street this morning killed one member of our subcontractor crew and injured another. I know many of you worked alongside them. Counselling support is available immediately \u2014 contact HR or call the EAP line. The site is closed until further notice. Do not speak to media; direct all enquiries to Comms. We will hold an all-hands briefing at 4 p.m. today. Please look after each other.',
          external: 'We are devastated to confirm that a worker lost their life in an incident at our River Street construction site this morning. Our thoughts are with their family and colleagues. Emergency services responded immediately. The site is closed and an investigation is underway. A second worker was injured; their injuries are not life-threatening. We will provide an update by 2 p.m. today. Media enquiries: 0800-555-0199.',
          issue: 'coherent',
          options: [
            { val: 'coherent', label: 'These messages are coherent' },
            { val: 'severity-mismatch', label: 'Internal is more alarmed than external' },
            { val: 'detail-gap', label: 'External reveals too much internal process' },
            { val: 'tone-gap', label: 'The tones are mismatched in a damaging way' }
          ],
          explanation: 'These messages are well-calibrated. Both acknowledge the severity honestly. The internal message adds operational detail (counselling, media protocol, briefing time) that staff need but the public does not. The external message adds a media contact line and update commitment. If seen together, they tell a consistent story \u2014 the internal one is simply more operationally specific, which is entirely appropriate.'
        },
        {
          title: 'Scenario 3: CEO Health Crisis',
          internal: 'CONFIDENTIAL. The CEO was hospitalised this morning with a suspected stroke. Prognosis is uncertain \u2014 the next 48 hours are critical. Sarah Martinez (COO) has assumed full operational authority effective immediately. All scheduled client meetings this week will proceed as planned with Sarah or designated deputies. Do not share medical details with anyone outside the company. We will update staff by end of day tomorrow.',
          external: 'We can confirm that our CEO is receiving medical treatment following a health event earlier today. We wish them a full and speedy recovery. Our experienced leadership team, led by COO Sarah Martinez, ensures full continuity of operations. Business continues as normal. We will provide a further update when appropriate.',
          issue: 'prognosis-gap',
          options: [
            { val: 'coherent', label: 'These messages are coherent' },
            { val: 'prognosis-gap', label: 'Internal says "critical" while external implies "speedy recovery"' },
            { val: 'detail-gap', label: 'External shares too much medical information' },
            { val: 'tone-gap', label: 'Internal message should be more optimistic for morale' }
          ],
          explanation: 'The internal message honestly states the prognosis is uncertain and the next 48 hours are critical. The external message wishes for "a full and speedy recovery" \u2014 implying confidence in a good outcome that the internal facts do not support. If a journalist obtains the internal memo (and they often do), the gap between "critical" and "speedy recovery" suggests the company is deliberately misleading the public and shareholders about a serious leadership continuity risk.'
        },
        {
          title: 'Scenario 4: Environmental Spill',
          internal: 'All operations staff: a pipe failure in Section 7 has released an estimated 4,000 litres of process water into Millbrook Creek. Environmental team is on site. Early readings show elevated chemical levels but below acute toxicity thresholds. The EPA has been notified as required. Do not discuss volumes or readings with anyone outside the response team. Next internal update at 6 p.m.',
          external: 'We are aware of a discharge from our facility into Millbrook Creek following an equipment failure. We immediately deployed our environmental response team and have notified the relevant regulatory authority. We are conducting water quality testing and will share results as soon as they are available. Residents near the creek are advised to avoid contact with the water as a precaution. Updates will be posted on our website. Community concerns: 0800-555-0234.',
          issue: 'coherent',
          options: [
            { val: 'coherent', label: 'These messages are coherent' },
            { val: 'severity-mismatch', label: 'Internal is more alarmed than external' },
            { val: 'withholding', label: 'External dangerously withholds volume and readings' },
            { val: 'tone-gap', label: 'Internal is too casual about the environmental damage' }
          ],
          explanation: 'These messages are coherent. The external statement appropriately withholds specific volumes and readings \u2014 not to hide something, but because sharing preliminary technical data before verification can cause panic or be misinterpreted. "Below acute toxicity thresholds" is a technical determination that needs context the public cannot easily process. The "avoid contact as a precaution" guidance is the right call. The internal message gives operational staff the detail they need. Both are honest and consistent in how seriously they treat the situation.'
        }
      ];

      var answers = {};
      var submitted = false;

      function render() {
        var html = '';

        pairs.forEach(function(p, pi) {
          html += '<div style="background:var(--elevated);border-radius:8px;padding:1rem;margin-bottom:1rem;">';
          html += '<strong style="color:var(--accent);font-size:0.9rem;">' + p.title + '</strong>';

          html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin:0.75rem 0;">';
          html += '<div style="background:var(--surface);border-radius:6px;padding:0.75rem;border-left:3px solid var(--accent);">';
          html += '<div style="font-size:0.75rem;font-weight:700;color:var(--accent);text-transform:uppercase;margin-bottom:0.3rem;">Internal (to staff)</div>';
          html += '<p style="font-size:0.82rem;margin:0;line-height:1.45;">' + p.internal + '</p>';
          html += '</div>';
          html += '<div style="background:var(--surface);border-radius:6px;padding:0.75rem;border-left:3px solid var(--warm);">';
          html += '<div style="font-size:0.75rem;font-weight:700;color:var(--warm);text-transform:uppercase;margin-bottom:0.3rem;">External (to public)</div>';
          html += '<p style="font-size:0.82rem;margin:0;line-height:1.45;">' + p.external + '</p>';
          html += '</div></div>';

          if (!submitted) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">';
            p.options.forEach(function(o) {
              var sel = answers[pi] === o.val;
              html += '<button class="sp-opt-btn" data-pair="' + pi + '" data-val="' + o.val + '" style="font-size:0.8rem;padding:0.4rem 0.75rem;border-radius:6px;border:1px solid ' + (sel ? 'var(--accent)' : '#1e3a5f30') + ';background:' + (sel ? 'var(--accent)20' : 'transparent') + ';color:' + (sel ? 'var(--accent)' : 'var(--text-secondary)') + ';cursor:pointer;">' + o.label + '</button>';
            });
            html += '</div>';
          } else {
            var userAnswer = answers[pi] || 'none';
            var correct = userAnswer === p.issue;
            var icon = correct ? '\u2713' : '\u2717';
            var clr = correct ? 'var(--success)' : '#991b1b';
            html += '<div style="margin-top:0.5rem;padding:0.75rem;background:var(--surface);border-radius:6px;border-left:3px solid ' + clr + ';">';
            html += '<span style="color:' + clr + ';font-weight:700;">' + icon + '</span> ';
            if (!correct) {
              var correctLabel = '';
              p.options.forEach(function(o) { if (o.val === p.issue) correctLabel = o.label; });
              html += '<span style="font-size:0.82rem;color:' + clr + ';">Correct answer: ' + correctLabel + '</span><br>';
            }
            html += '<p style="font-size:0.82rem;margin:0.3rem 0 0;color:var(--text-secondary);line-height:1.45;">' + p.explanation + '</p>';
            html += '</div>';
          }

          html += '</div>';
        });

        if (!submitted) {
          var answered = 0;
          for (var k in answers) { if (answers.hasOwnProperty(k)) answered++; }
          html += '<div style="text-align:center;margin-top:0.5rem;">';
          html += '<button id="sp-submit"' + (answered < pairs.length ? ' disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '>Check Your Analysis</button>';
          html += '</div>';
        } else {
          var correct = 0;
          pairs.forEach(function(p, pi) { if (answers[pi] === p.issue) correct++; });
          html += '<div style="text-align:center;margin-top:1rem;padding:1rem;background:var(--elevated);border-radius:8px;">';
          html += '<strong style="color:var(--accent);">' + correct + ' of ' + pairs.length + ' correct</strong>';
          html += '<p style="font-size:0.85rem;color:var(--text-secondary);margin:0.3rem 0 0;">The coherence test \u2014 "would these survive being read together?" \u2014 is one of the most practical checks a crisis leader can apply before any message goes out.</p>';
          html += '</div>';
        }

        container.innerHTML = html;

        if (!submitted) {
          var btns = container.querySelectorAll('.sp-opt-btn');
          for (var i = 0; i < btns.length; i++) {
            (function(b) {
              b.addEventListener('click', function() {
                answers[parseInt(b.getAttribute('data-pair'))] = b.getAttribute('data-val');
                render();
              });
            })(btns[i]);
          }
          var sub = document.getElementById('sp-submit');
          if (sub && !sub.disabled) {
            sub.addEventListener('click', function() {
              submitted = true;
              render();
            });
          }
        }
      }

      render();
    } catch(e) {
      document.getElementById('sp-content').innerHTML = '<p style="color:var(--text-secondary);font-style:italic;">Interactive widget could not load. The Message Leak Test presents paired internal and external crisis messages for you to evaluate for coherence gaps.</p>';
    }
  })();"""

html = html[:idx3_content_start] + NEW_WIDGET3_JS + "\n  " + html[idx3_script_end:]

print("Replaced Widget 3 script block")

# ── Write the file ──────────────────────────────────────────────────────────

with open(FILE, "w") as f:
    f.write(html)

print("Done! Replaced both widgets in", FILE)
print(f"File size: {len(html):,} bytes")
