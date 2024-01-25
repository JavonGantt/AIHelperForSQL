import dotenv from 'dotenv';
dotenv.config({ path: '../ApiKeys/apiKeys.env' });
import express from "express"
import axios from "axios"
import bodyParser from "body-parser"
import OpenAI from 'openai';
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "@langchain/core/messages";
import {
  JSONLoader,
  JSONLinesLoader,
} from "langchain/document_loaders/fs/json";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { MessagesPlaceholder } from "@langchain/core/prompts";





const app = express();
const port = 3000;


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


const API_KEY = process.env.OPENAI_API_KEY
const assistantID = process.env.ASSISTANTNAME
const parser = new JsonOutputFunctionsParser()

const openai = new OpenAI({
  apiKey: API_KEY,
}); // Make sure your API key is configured



// This function will make a call to chatGPT Model gpt-3.5-turbo. If not wanting to use assistant, revisit this
// async function generateSQLQuery(queryDescription) {
//   const completion = await openai.chat.completions.create({
//     messages: [{ role: "user", content: queryDescription }],
//     model: "gpt-3.5-turbo",
//     max_tokens: 700
//   });
// }








  const model = new ChatOpenAI({ modelName: "gpt-4" });

// async function generateSQLQuery(queryDescription) {

//   //initialize the conversation space
//   const thread = await openai.beta.threads.create();
//   //handles the message from the user
//   const message = await openai.beta.threads.messages.create(
//     thread.id,
//     {
//       role: "user",
//       content: queryDescription
//     }

//   )

//   const run = await openai.beta.threads.runs.create(
//     thread.id,
//     { 
//       assistant_id: assistantID
//     }
//   );

//   await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for the assistant to respond

//   const messages = await openai.beta.threads.messages.list(
//     thread.id,
//   );
//   console.log(messages.data[0].content[0].text.value)
//     const assistantMessageText = messages.data[0].content[0].text.value;

//     console.log( "assistant response" + assistantMessageText);

//     const response = await openai.chat.completions.create({
//       model: "ft:gpt-3.5-turbo-1106:personal::8jvEI4Vi",
//       messages: [
//         {
//           "role": "user",
//           "content": assistantMessageText
//         }
//       ],
//       temperature: 1,
//       max_tokens: 4096,
//       top_p: 1,
//       frequency_penalty: 0,
//       presence_penalty: 0,
//     });
  
//   console.log( "Final Message " + response.choices[0].message.content)

//   return  response.choices[0].message.content
// }






async function generateSQLQuery(queryDescription) {
// LangChain Implementation
const instructions1 = `You're core function is to provide a SQL query with explenation on tables/fields used. You must be concise, but also well informative. You will receive requests to generate different types of queries.

It is crucial to evaluate the DBML file and correctly send the fields, use tools to be able to look at the Dbml file that is attached. Follow the schema and use your best judgment to determine which tables to use

When referencing fields, always include the prefix "SSOT__" as part of the field name. This is crucial for maintaining consistency and accuracy in data referencing.

Thoroughly understand the relationships between different tables in the Salesforce CDP. This knowledge is essential for correctly constructing SQL joins.
Ensure that your joins are accurate and efficient, based on the relationships outlined in the data schema.

For each table you work with, be aware of its specific purpose and usage within the Salesforce environment. This understanding is vital for effective query construction.
Familiarize yourself with the descriptions of each table. This information is key to understanding the context and relevance of the data within your queries.

Specialize in using Trino SQL for querying Salesforce data. Ensure all queries and data manipulations adhere to Trino SQL syntax and best practices.
Stay informed about the unique aspects of Salesforce CDP that may affect SQL query construction and optimization.

Keep your knowledge base updated with the latest developments in Salesforce CDP, Trino SQL, and data management practices.
Adapt to changes in Salesforce CDP structures, fields, and data management policies.

Things to remember:
It is very important that when looking back at  dates, you use this format:
(CURRENT_DATE - INTERVAL '1' MONTH)`

const instructions2 = `For queries involving individual customers and their email details, use the "UnifiedIndividual__dlm" table and "UnifiedContactPointEmail__dlm" table. Join them on "UnifiedIndividual__dlm"."Contact_ID__c" and "UnifiedContactPointEmail__dlm"."ssot__PartyId__c".

To query loyalty program members and their virtual vouchers, join "UnifiedIndividual__dlm" with "LoyaltyMemberVirtualVoucher__dlm" using "UnifiedIndividual__dlm"."Loyalty_ID__c" and "LoyaltyMemberVirtualVoucher__dlm"."Loyalty_Program_Member_c__c". Also, include "ssot__LoyaltyProgramMember__dlm" in the join with "ssot__LoyaltyProgramMember__dlm"."ssot__Id__c".

When dealing with sales orders and their related products, link "ssot__SalesOrder__dlm" with "ssot__SalesOrderProduct__dlm" using "ssot__SalesOrder__dlm"."ssot__OrderNumber__c" and "ssot__SalesOrderProduct__dlm"."Transaction_ID__c".

For information on products sold, join "ssot__GoodsProduct__dlm" with "ssot__SalesOrderProduct__dlm" on "ssot__GoodsProduct__dlm"."ssot__Id__c" and "ssot__SalesOrderProduct__dlm"."ssot__ProductId__c".

To connect demographic information with individual customers, use "Acxiom_Demographics__dlm" and join it with "UnifiedIndividual__dlm" using "Acxiom_Demographics__dlm"."contact_id__c" and "UnifiedIndividual__dlm"."Contact_ID__c".

Remember to always prefix fields with "SSOT__" and use the date format "(CURRENT_DATE - INTERVAL '1' MONTH)" when querying dates. This will ensure consistency and accuracy in your data retrieval and analysis.`

const instructions3 = `It is crucial that you use the correct fields with the correct tables. Failure to do so will lead to incorrectness. Also, there is no need to add additional "" around fields unless necessary`

const instructions = instructions1 + " " + instructions2 + " " + instructions3


const embeddings = new OpenAIEmbeddings();
const openAIAPI = process.env.OPENAI_API_KEY
const outputParser = new StringOutputParser();

const loader = new DirectoryLoader(
    "\ReferenceFiles",
    {
      ".json": (path) => new JSONLoader(path, "/texts"),
      ".jsonl": (path) => new JSONLinesLoader(path, "/html"),
      ".txt": (path) => new TextLoader(path),
      ".csv": (path) => new CSVLoader(path, "text"),
      ".pdf": (path) => new PDFLoader(path, "/pdf")
    }
  );

// this loade grabs a webpage
  // const loader = new CheerioWebBaseLoader(
  //   "https://www.instagram.com/javongantt/"
  // );

  const docs = await loader.load();
const splitter = new RecursiveCharacterTextSplitter();


const splitDocs = await splitter.splitDocuments(docs);
const vectorstore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings
  );
  const retriever = vectorstore.asRetriever();

// console.log(docs.length);
// console.log(docs[0].pageContent.length);
// console.log(splitDocs.length);
// console.log(splitDocs[0].pageContent.length);


const chatModel = new ChatOpenAI({
    openAIApiKey: openAIAPI,
  });


  // const prompt = ChatPromptTemplate.fromMessages([
  //   ["system", instructions],
  //   ["user", "{input}"],
  // ]);
  

  const prompt =
  ChatPromptTemplate.fromTemplate(`${instructions} .Answer the following question based only on the provided context:

<context>
{context}
</context>

Question: {input}`);

const documentChain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt,
  });



//   const chain = prompt.pipe(chatModel)
//   const llmChain = prompt.pipe(chatModel).pipe(outputParser);


const historyAwarePrompt = ChatPromptTemplate.fromMessages([
  new MessagesPlaceholder("chat_history"),
  ["user", "{input}"],
  [
    "user",
    "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
  ],
]);

const historyAwareRetrieverChain = await createHistoryAwareRetriever({
  llm: chatModel,
  retriever,
  rephrasePrompt: historyAwarePrompt,
});


const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Answer the user's questions based on the below context:\n\n{context}",
  ],
  new MessagesPlaceholder("chat_history"),
  ["user", "{input}"],
]);

const historyAwareCombineDocsChain = await createStuffDocumentsChain({
  llm: chatModel,
  prompt: historyAwareRetrievalPrompt,
});

const conversationalRetrievalChain = await createRetrievalChain({
  retriever: historyAwareRetrieverChain,
  combineDocsChain: historyAwareCombineDocsChain,
});

  const retrievalChain = await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever,
  });
  

  const result2 = await conversationalRetrievalChain.invoke({
    chat_history: [],
    input: queryDescription,
  });
  
  console.log(result2.answer);

  // const result = await retrievalChain.invoke({
  //   input: `${queryDescription}` ,
  // });
  
  // console.log(result.answer);

   return result2.answer
}

// var text = "What table would give me a count of loyalty members"
// console.log(generateSQLQuery(text))



// async function generateSQLQuery(queryDescription){
//   const response = await openai.chat.completions.create({
//     model: "ft:gpt-3.5-turbo-1106:personal::8jvEI4Vi",
//     messages: [
//       {
//         "role": "user",
//         "content": queryDescription
//       }
//     ],
//     temperature: 1,
//     max_tokens: 4096,
//     top_p: 1,
//     frequency_penalty: 0,
//     presence_penalty: 0,
//   });

// console.log(response.choices[0].message.content)
// return  response.choices[0].message.content
// }






app.get("/", async (req, res) => {
    try {
      // Pass the JSON data as null
      res.render("main.ejs");
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error rendering the homepage' });
    }
  });



  

  app.post('/generate-sql', async (req, res) => {
    try {
        const userInput = req.body.query;
        const userOption = req.body.option;
        const database = req.body.database
        const aiRequest = userInput
        //  + " " + userOption


        const aiResponse = await generateSQLQuery(aiRequest)
        res.json({ sql: aiResponse})
    } catch (error) {
        res.status(500).send("Error processing your request");
        console.log(error)
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });