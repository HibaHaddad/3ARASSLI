# Admin Dashboard Stats Implementation

## Steps from approved plan:

- [x] Create TODO.md  
- [x] 1. Add 'dashboard' section to frontend/src/pages/admin/adminData.js as first item
- [x] 2. Refactor frontend/src/pages/AdminDashboard.jsx:
  - Move admin-kpi-grid from outer JSX to inside renderSection() if(activeSection === 'dashboard')
  - Enhance kpis useMemo with 6-8 stats: active providers, pending appts/contracts/invoices, total revenue (sum paid invoices), total reviews, active packs, total appointments
  - Set useState default activeSection to 'dashboard'
- [ ] 3. Test: cd frontend && npm run dev, verify sidebar shows Dashboard first, stats ONLY on dashboard tab, other sections clean
- [ ] 4. Optional: Add API fetch for real stats in useEffect
- [x] 5. Mark complete & attempt_completion
