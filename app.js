function renderRules() {
  const buyIn = bracketData?.buyIn ?? 20;
  const paidCount = (paidData?.paidNames || []).length;
  const pot = paidCount * buyIn;

  // Update the front-page line: Players / Pot
  const metaLine = document.getElementById("metaLine");
  if (metaLine) {
    metaLine.textContent = `Players: ${paidCount} • Pot: $${pot}`;
  }

  // Render the Rules tab
  $("rules").innerHTML = `
    <div><b>Buy-in:</b> $${buyIn} per person</div>
    <div><b>Paid entries (so far):</b> ${paidCount}</div>
    <div><b>Current pot (paid only):</b> ${money(pot)}</div>
    <hr />
    <div><b>Weighted scoring:</b></div>
    <ul>
      ${(bracketData?.rounds || []).map(r => `<li>${r.name}: ${r.weight} point(s) per correct pick</li>`).join("")}
    </ul>
    <div><b>Payouts (percent of pot):</b></div>
    <ul>
      <li>Round of 64 leader: ${money(pot * PAYOUT_PCT.R64)} (5%)</li>
      <li>Round of 32 leader: ${money(pot * PAYOUT_PCT.R32)} (5%)</li>
      <li>Sweet 16 leader: ${money(pot * PAYOUT_PCT.S16)} (7.5%)</li>
      <li>Elite 8 leader: ${money(pot * PAYOUT_PCT.E8)} (7.5%)</li>
      <li>Final Four leader: ${money(pot * PAYOUT_PCT.F4)} (10%)</li>
      <li><b>Overall champion:</b> ${money(pot * PAYOUT_PCT.CHAMP)} (65%)</li>
    </ul>
    <div class="small">Ties split that round’s bonus evenly. Tiebreaker is Championship total points.</div>
  `;
}
