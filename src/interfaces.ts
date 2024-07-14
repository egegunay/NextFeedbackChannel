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