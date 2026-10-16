import { useState } from 'react';
import { AlertTriangle, Loader2, Sparkles, UserCheck, Wand2 } from 'lucide-react';
import Button from './Button.jsx';
import { bugService } from '../services/api.js';
import { priorityClass, titleCase } from '../utils/format.js';

const IDLE = 'idle';
const LOADING = 'loading';

/**
 * Reusable AI assistance panel.
 *
 * Two independent capabilities are rendered depending on the props supplied:
 *
 *  - `triagePayload` enables the "AI Triage" action. When triggered it posts the
 *    supplied `{ title, description, steps_to_reproduce }` to
 *    `POST /api/bugs/ai-triage` and previews the suggested priority, severity
 *    and possible root cause. `onTriageResult` (if provided) receives the raw
 *    result so callers can auto-populate their forms.
 *
 *  - `bugId` enables the "AI Suggest Assignee" action. When triggered it posts
 *    to `POST /api/bugs/:id/ai-suggest-assignee` and renders candidate developer
 *    cards with a match percentage badge and a "1-Click Assign" button.
 */
export default function AIAssistPanel({
  bugId,
  triagePayload,
  onTriageResult,
  onAssign,
  triageDisabled = false,
  assignDisabled = false,
}) {
  const canTriage = Boolean(triagePayload);
  const canSuggest = Boolean(bugId);

  const [triageState, setTriageState] = useState(IDLE);
  const [triageResult, setTriageResult] = useState(null);
  const [triageError, setTriageError] = useState(null);

  const [assignState, setAssignState] = useState(IDLE);
  const [recommendations, setRecommendations] = useState([]);
  const [assignError, setAssignError] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [assignedId, setAssignedId] = useState(null);

  if (!canTriage && !canSuggest) return null;

  const triageLoading = triageState === LOADING;
  const assignLoading = assignState === LOADING;

  const runTriage = async () => {
    setTriageState(LOADING);
    setTriageError(null);
    try {
      const result = await bugService.aiTriage(triagePayload);
      setTriageResult(result);
      onTriageResult?.(result);
    } catch (err) {
      setTriageError(err.message || 'AI triage is unavailable right now.');
    } finally {
      setTriageState(IDLE);
    }
  };

  const runSuggest = async () => {
    setAssignState(LOADING);
    setAssignError(null);
    try {
      const data = await bugService.aiSuggestAssignee(bugId);
      setRecommendations(data?.recommendations || []);
    } catch (err) {
      setAssignError(err.message || 'AI assignee recommendations are unavailable right now.');
    } finally {
      setAssignState(IDLE);
    }
  };

  const handleAssign = async (recommendation) => {
    if (!onAssign) return;
    setAssigningId(recommendation.userId);
    setAssignError(null);
    try {
      await onAssign(recommendation.userId, recommendation);
      setAssignedId(recommendation.userId);
    } catch (err) {
      setAssignError(err.message || 'Unable to assign the selected developer.');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="card ai-assist" data-testid="ai-assist-panel">
      <div className="ai-assist__header">
        <h2 className="ai-assist__title">
          <Sparkles size={18} aria-hidden="true" /> AI Assist
        </h2>
      </div>

      {canTriage && (
        <div className="ai-assist__section" data-testid="ai-triage-section">
          <div className="ai-assist__actions">
            <Button
              variant="secondary"
              onClick={runTriage}
              disabled={triageLoading || triageDisabled}
              data-testid="ai-triage-button"
            >
              {triageLoading ? (
                <Loader2 size={16} className="ai-assist__spinner" aria-hidden="true" />
              ) : (
                <Wand2 size={16} aria-hidden="true" />
              )}
              {triageLoading ? 'Analyzing…' : 'AI Triage'}
            </Button>
          </div>

          {triageLoading && (
            <div className="ai-assist__skeleton" role="status" data-testid="ai-triage-loading">
              <span className="ai-assist__skeleton-line" />
              <span className="ai-assist__skeleton-line ai-assist__skeleton-line--short" />
            </div>
          )}

          {triageError && (
            <div className="ai-assist__error" role="alert" data-testid="ai-triage-error">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{triageError}</span>
            </div>
          )}

          {triageResult && !triageLoading && (
            <div className="ai-assist__result" data-testid="ai-triage-result">
              <div className="ai-assist__badges">
                {triageResult.suggested_priority && (
                  <span
                    className={priorityClass(triageResult.suggested_priority)}
                    data-testid="ai-suggested-priority"
                  >
                    {titleCase(triageResult.suggested_priority)}
                  </span>
                )}
                {triageResult.suggested_severity && (
                  <span className="badge" data-testid="ai-suggested-severity">
                    {titleCase(triageResult.suggested_severity)}
                  </span>
                )}
              </div>
              {triageResult.summary && <p>{triageResult.summary}</p>}
              {triageResult.possible_root_cause && (
                <div className="ai-assist__root-cause">
                  <strong>Possible root cause</strong>
                  <p>{triageResult.possible_root_cause}</p>
                </div>
              )}
              <p className="muted ai-assist__source">
                Source: {triageResult.source === 'ai' ? 'AI model' : 'heuristic engine'}
              </p>
            </div>
          )}
        </div>
      )}

      {canSuggest && (
        <div className="ai-assist__section" data-testid="ai-assign-section">
          <div className="ai-assist__actions">
            <Button
              variant="secondary"
              onClick={runSuggest}
              disabled={assignLoading}
              data-testid="ai-suggest-button"
            >
              {assignLoading ? (
                <Loader2 size={16} className="ai-assist__spinner" aria-hidden="true" />
              ) : (
                <UserCheck size={16} aria-hidden="true" />
              )}
              {assignLoading ? 'Scoring developers…' : 'AI Suggest Assignee'}
            </Button>
          </div>

          {assignLoading && (
            <div className="ai-assist__skeleton" role="status" data-testid="ai-assign-loading">
              <span className="ai-assist__skeleton-line" />
              <span className="ai-assist__skeleton-line ai-assist__skeleton-line--short" />
            </div>
          )}

          {assignError && (
            <div className="ai-assist__error" role="alert" data-testid="ai-assign-error">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{assignError}</span>
            </div>
          )}

          {!assignLoading && recommendations.length > 0 && (
            <ul className="ai-assist__candidates" data-testid="ai-recommendations">
              {recommendations.map((recommendation) => {
                const isAssigning = assigningId === recommendation.userId;
                const isAssigned = assignedId === recommendation.userId;
                return (
                  <li
                    key={recommendation.userId}
                    className="ai-assist__candidate"
                    data-testid="ai-candidate"
                  >
                    <div className="ai-assist__candidate-info">
                      <p className="ai-assist__candidate-name">{recommendation.name}</p>
                      <span
                        className="badge ai-assist__match"
                        data-testid="ai-match-badge"
                      >
                        {recommendation.matchScore}% Match
                      </span>
                      {recommendation.reason && (
                        <p className="muted ai-assist__reason">{recommendation.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => handleAssign(recommendation)}
                      disabled={assignDisabled || isAssigning || isAssigned}
                      data-testid={`ai-assign-${recommendation.userId}`}
                    >
                      {isAssigned ? 'Assigned' : isAssigning ? 'Assigning…' : '1-Click Assign'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {!assignLoading && !assignError && recommendations.length === 0 && (
            <p className="muted ai-assist__empty" data-testid="ai-no-recommendations">
              Run the assistant to see suggested assignees.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
