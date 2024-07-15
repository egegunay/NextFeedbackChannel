interface BaseInterface {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Business extends BaseInterface {
	name: string;
}

export interface Survey extends BaseInterface {
	businessId: string;
	question: string;
	answers: Array<string>;
}

export interface Feedback<T> extends BaseInterface {
	surveyId: string;
	payload: T;
}

export type SurveyCreatePayload = {
	business_id: string;
	questions: Record<string, JSON[]>[];
};

export type FeedbackPayload = {
	question_id: string;
	answer: string;
}[];