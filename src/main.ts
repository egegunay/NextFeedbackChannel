import { Hono, Context } from 'hono'
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { FeedbackPayload, SurveyCreatePayload, SurveyUpdatePayload } from "./interfaces.ts";

const env = await load();

const client = new Client({
	hostname: "localhost",
	port: 5432,
	user: "postgres",
	password: env['POSTGRES_PASSWORD'],
	database: "postgres",
});

try {
	await client.connect();
} catch (e) {
	if (e instanceof Deno.errors.ConnectionRefused) {
		console.error(e.message);
	}
}

const app = new Hono();

const decoder = new TextDecoder("utf-8");

app.get('/adminpage', async (c: Context) => {
	const data = await Deno.readFile("./frontend/admin.html");
	return c.html(decoder.decode(data));
});

app.get('/survey/:survey-id', async (c: Context) => {
	const data = await Deno.readFile("./frontend/frontend.html");
	return c.html(decoder.decode(data));
});

app.get('/survey/:survey-id/feedback', async (c: Context) => {
	const id: string = c.req.param('survey-id');
	const query = `select * from feedback where survey_id = $1`;

	try {
		const fb = await client.queryArray({
			text: query,
			args: [id]
		});

		return c.json(fb.rows);
	} catch (error) {
		console.error(error);
		return c.json({ error: "Internal Server Error" }, 500);
	}
});

app.get('/business/:business-id/feedback', async (c: Context) => {
	const id: string = c.req.param('business-id');
	const query = `select * from feedback f join survey s on f.survey_id = s.id where s.business_id = $1`;

	try {
		const fb = await client.queryArray({
			text: query,
			args: [id]
		});

		return c.json(fb.rows);
	} catch (error) {
		console.error(error);
		return c.json({ error: "Internal Server Error" }, 500);
	}
});

app.post('/nfcsjob', async (c: Context) => {
	const business_id: string = await c.req.text();
	const query = `select id from survey where business_id = $1 order by created_at desc limit 1;`;

	try {
		const ids = await client.queryArray({
			text: query,
			args: [business_id]
		});

		if (ids.rowCount === 0) {
			return c.json({ survey_link: "No survey found" });
		}

		return c.json({ survey_link: `survey/${ids.rows[0][0]}` });
	} catch (error) {
		console.error(error);
		return c.json({ error: "Internal Server Error" }, 500);
	}
});

app.post('/survey/:survey-id/feedback', async (c: Context) => {
	const feedbackID: string = crypto.randomUUID();
	const payload: FeedbackPayload = await c.req.json();
	const surveyID: string = c.req.param('survey-id');

	const query = `INSERT INTO feedback (id, survey_id, payload, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW());`;

	try {
		await client.queryArray({
			text: query,
			args: [feedbackID, surveyID, payload]
		});

		return c.text("Feedback submitted successfully");
	} catch (error) {
		console.error(error);
		return c.text(`error: "Internal Server Error"`, 500);
	}
});

app.post('/surveyCreate', async (c: Context) => {
	const id: string = crypto.randomUUID();
	const payload: SurveyCreatePayload = await c.req.json();

	const query = `INSERT INTO survey (id, business_id, created_at, updated_at, questions) VALUES ($1, $2, NOW(), NOW(), $3);`;

	try {
		await client.queryArray({
			text: query,
			args: [id, payload.business_id, payload.questions]
		});

		return c.text("Survey created successfully");
	} catch (error) {
		console.error(error);
		return c.text(`error: "Internal Server Error"`, 500);
	}
});

app.post('/businessCreate', async (c: Context) => {
	const id: string = crypto.randomUUID();
	const name: string = await c.req.text();

	const query = `INSERT INTO business (id, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW());`;

	try {
		await client.queryArray({
			text: query,
			args: [id, name]
		});
	} catch (error) {
		console.error(error);
		return c.text(`error: "Internal Server Error"`, 500);
	}

	const resultQuery = `select id from business where name = $1 order by created_at desc limit 1;`;

	try {
		const ids = await client.queryArray({
			text: resultQuery,
			args: [name]
		});

		return c.json({ business_id: `${ids.rows[0][0]}` });
	} catch (error) {
		console.error(error);
		return c.json({ error: "Internal Server Error" }, 500);
	}
});

app.post('/survey/:survey-id', async (c: Context) => {
	const id: string = c.req.param('survey-id');
	const query = `select questions from survey where id = $1 order by created_at desc limit 1;`;

	try {
		const qna = await client.queryArray({
			text: query,
			args: [id]
		});

		if (qna.rowCount === 0) {
			return c.json({ error: "Survey not found" }, 404);
		}

		return c.json(qna.rows[0][0] as JSON);
	} catch (error) {
		console.error(error);
		return c.json({ error: "Internal Server Error" }, 500);
	}
});

app.post('/surveyUpdate', async (c: Context) => {
	const payload: SurveyUpdatePayload = await c.req.json();

	const query = `update survey set questions = $1::jsonb[] where id = $2;`;

	try {
		await client.queryArray({
			text: query,
			args: [payload.new_survey, payload.survey_id]
		});

		return c.text("Survey updated successfully");
	} catch (error) {
		console.error(error);
		return c.text(`error: "Internal Server Error"`, 500);
	}
})

Deno.serve(app.fetch);
