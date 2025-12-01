export interface Principle {
  id: string;
  title: string;
  description: string;
}

export interface DecisionRecord {
  id: string;
  date: string;
  situation: string;
  relevantPrinciples: RelevantPrinciple[];
  finalAdvice: string;
}

export interface RelevantPrinciple {
  principleId: string;
  principleTitle: string;
  principleDescription: string;
  reflectionQuestion: string;
  userAnswer?: string;
}

export interface AnalysisResult {
  relevantPrinciples: RelevantPrinciple[];
}

export enum ViewState {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  PRINCIPLES = 'PRINCIPLES',
  NEW_DECISION_INPUT = 'NEW_DECISION_INPUT',
  DECISION_REFLECTION = 'DECISION_REFLECTION',
  DECISION_RESULT = 'DECISION_RESULT',
  HISTORY = 'HISTORY',
  HISTORY_DETAIL = 'HISTORY_DETAIL'
}
