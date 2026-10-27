'use client';
// The ledger table: used by the Transactions view (sortable, with checkboxes) and by the overview preview (plain rows).
import { useRef, type KeyboardEvent } from 'react';
import { Glyph, cx } from './_dash';
import { acctOf, dShort, type Tx } from './_fin';
import { Amt, StatusPill } from './_fin-ui';

export type SortKey = 'date' | 'amt';
export interface LedgerProps { rows: Tx[]; sel: string | null; onOpen: (id: string) => void; empty: string; sort?: { key: SortKey; dir: 1 | -1 }; onSort?: (k: SortKey) => void; checked?: Set<string>; onCheck?: (id: string, on: boolean) => void; onCheckAll?: (on: boolean) => void; caption?: string }

export function Ledger({ rows, sel, onOpen, empty, sort, onSort, checked, onCheck, onCheckAll, caption }: LedgerProps) {
  const body = useRef<HTMLTableSectionElement>(null);
  const tab = sel && rows.some((r) => r.id === sel) ? sel : rows[0]?.id;
  const sels = !!onCheck, nChk = checked ? rows.filter((r) => checked.has(r.id)).length : 0;
  const onKey = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(id); return; }
    if ((e.key === 'x' || e.key === 'X') && onCheck) { e.preventDefault(); onCheck(id, !checked?.has(id)); return; }
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : e.key === 'Home' ? -99999 : e.key === 'End' ? 99999 : 0;
    if (!d) return; e.preventDefault();
    const i = rows.findIndex((r) => r.id === id), n = Math.max(0, Math.min(rows.length - 1, i + d));
    (body.current?.querySelector(`[data-row="${rows[n]!.id}"]`) as HTMLElement | null)?.focus();
  };
  const head = (k: SortKey, label: string, right?: boolean) => (
    <th scope="col" className={cx(right && 'is-r')} aria-sort={sort?.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      {onSort ? <button type="button" onClick={() => onSort(k)} aria-label={`Sort by ${label.toLowerCase()}`}>{label}<Glyph name="down" size={11} className={cx('td-sortic', sort?.key === k && 'is-on', sort?.key === k && sort.dir === 1 && 'is-asc')} /></button> : label}
    </th>
  );
  const cols = sels ? 7 : 6;
  return (
    <div className="tf-tablewrap">
      <table className={cx('tf-table', sels && 'has-check')}>
        <caption className="td-sr">{caption ?? 'Transactions'}. Arrow keys move between rows, Enter opens details{sels ? ', X selects a row' : ''}.</caption>
        <thead><tr>
          {sels && <th scope="col" className="tf-ck"><input type="checkbox" aria-label={`Select all ${rows.length} shown`} checked={nChk > 0 && nChk === rows.length} ref={(el) => { if (el) el.indeterminate = nChk > 0 && nChk < rows.length; }} onChange={(e) => onCheckAll?.(e.target.checked)} /></th>}
          {head('date', 'Date')}<th scope="col">Description</th><th scope="col" className="hide-sm">Category</th><th scope="col" className="hide-md">Account</th><th scope="col" className="hide-sm">Status</th>{head('amt', 'Amount', true)}
        </tr></thead>
        <tbody ref={body}>
          {rows.length === 0 && <tr><td colSpan={cols} className="tf-none">{empty}</td></tr>}
          {rows.map((t) => (
            <tr key={t.id} data-row={t.id} tabIndex={t.id === tab ? 0 : -1} className={cx(sel === t.id && 'is-sel', checked?.has(t.id) && 'is-chk')} aria-current={sel === t.id ? 'true' : undefined} onClick={() => onOpen(t.id)} onKeyDown={(e) => onKey(e, t.id)}>
              {sels && <td className="tf-ck" onClick={(e) => e.stopPropagation()}><input type="checkbox" tabIndex={t.id === tab ? 0 : -1} aria-label={`Select ${t.name}, ${dShort(t.date)}`} checked={!!checked?.has(t.id)} onChange={(e) => onCheck?.(t.id, e.target.checked)} /></td>}
              <td className="tf-date">{dShort(t.date)}</td>
              <td><div className="tf-desc"><b>{t.name}</b><small>{t.memo}<span className="tf-st"> · <StatusPill s={t.status} /></span></small></div></td>
              <td className="hide-sm"><span className="tf-cat">{t.cat}</span></td>
              <td className="hide-md tf-ac">{acctOf(t.acct).name} <i>••{acctOf(t.acct).mask}</i></td>
              <td className="hide-sm"><StatusPill s={t.status} /></td>
              <td className="is-r"><Amt t={t} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
