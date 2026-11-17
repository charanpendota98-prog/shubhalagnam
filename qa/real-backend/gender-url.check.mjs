import {parseMatchFilters as P} from "/tmp/mv/frontend/src/lib/match-filter-query.mjs";
for (const q of ["gender=bride","gender=BRIDE","gender=Groom","gender=female","gender=xyz","gender=","gender=Bride&gender=Groom"]) console.log(q, "=>", JSON.stringify(P(q).gender));
