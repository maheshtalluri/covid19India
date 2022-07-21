const express = require("express");

const app = express();

app.use(express.json());

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log("DB error: ${error.message}");
    process.exit(1);
  }
};

initializeDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

// GET all states Details

app.get("/states/", async (request, response) => {
  const getStatesDetails = `
    SELECT *
    FROM state;`;

  const statesDetails = await database.all(getStatesDetails);

  response.send(
    statesDetails.map((state) => convertStateDbObjectToResponseObject(state))
  );
});

// GET state Details based on state_id

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getStateDetails = `
    SELECT *
    FROM state
    WHERE state_id = ${stateId}`;

  const stateDetails = await database.get(getStateDetails);

  response.send(convertStateDbObjectToResponseObject(stateDetails));
});

// create district table

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createDistrict = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES (${districtName}, ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`;

  await database.run(createDistrict);

  response.send("District Successfully Added");
});

// GET District based on District id

app.get("/districts/:district_id/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetails = `
    SELECT *
    FROM district
    WHERE district_id = ${districtId};`;

  const district = await database.get(getDistrictDetails);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

// DELETE District based on District Id

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
    DELETE FROM district
    WHERE district_id = ${districtId};`;

  await database.run(deleteDistrict);
  response.send("District Removed");
});

// UPDATE District API

app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrict = `
    UPDATE district
    SET 
    district_name = ${districtName},
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};`;

  await database.run(updateDistrict);
  response.send("District Details Updated");
});

// Return the state name based on districtId API

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const returnStateName = `
    SELECT 
    state_name
    FROM district NATURAL JOIN state
    WHERE district_id = ${districtId};`;

  const returnState = await database.get(returnStateName);
  response.send({ stateName: returnState.state_name });
});

// statistics of total cases, cured, active, deaths

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statisticsOfState = `
    SELECT
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM district
    WHERE state_id = ${stateId};`;

  const stats = await database.get(statisticsOfState);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

module.exports = app;
