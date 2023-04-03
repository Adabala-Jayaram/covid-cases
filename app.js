const express = require("express");
const { open } = require("sqlite");

const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const convertDbResponse = (stateDetails) => {
  return {
    stateId: stateDetails.state_id,
    stateName: stateDetails.state_name,
    population: stateDetails.population,
  };
};

const convertToPascal = (details) => {
  return {
    districtId: details.district_id,
    districtName: details.district_name,
    stateId: details.state_id,
    cases: details.cases,
    cured: details.cured,
    active: details.active,
    deaths: details.deaths,
  };
};

//Get All States API
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
     SELECT * 
     FROM state;`;
  const dbResponse = await db.all(getAllStatesQuery);
  response.send(
    dbResponse.map((stateDetails) => convertDbResponse(stateDetails))
  );
});

//Get State With Id API
app.get("/states/:stateId/", async (request, response) => {
  try {
    const { stateId } = request.params;
    console.log(stateId);
    const getStateWithId = `
    SELECT * 
    FROM state
    WHERE state_id = ${stateId};`;
    const dbResponse = await db.get(getStateWithId);
    response.send(convertDbResponse(dbResponse));
  } catch (e) {
    console.log(`${e.message}`);
  }
});

//Create A District API
app.post("/districts/", async (request, response) => {
  try {
    const districtDetails = request.body;

    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;

    const addDistrictQuery = `
            INSERT INTO
            district(district_name, state_id, cases, cured, active, deaths)
            VALUES (
              '${districtName}',
              ${stateId},
              ${cases},
              ${cured},
              ${active},
              ${deaths}

            );`;
    await db.run(addDistrictQuery);
    response.send("District Successfully Added");
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// Get District API
app.get("/districts/:districtId/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const getDistrictQuery = `
  SELECT * 
  FROM district
  WHERE district_id = ${districtId};`;
    const districtDetails = await db.get(getDistrictQuery);
    response.send(convertToPascal(districtDetails));
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// Delete District API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
   DELETE  
   FROM district
   WHERE district_id = ${districtId};`;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

// Update District Details API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cured, cases, active, deaths } = request.body;
  try {
    const updateQuery = `
     UPDATE district
     SET
     district_name = '${districtName}',
     state_id = ${stateId},
     cured = ${cured},
     cases = ${cases},
     active = ${active},
     deaths = ${deaths}
     WHERE district_id = ${districtId};`;
    await db.run(updateQuery);
    response.send("District Details Updated");
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// get total state wise cases API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateWiseCases = `
  SELECT 
    sum(cases) AS totalCases,
    sum(cured) AS totalCured,
    sum(active) AS totalActive,
    sum(deaths) AS totalDeaths
  FROM district
  WHERE state_id = ${stateId}
  GROUP BY state_id;`;

  const dbResponse = await db.get(getStateWiseCases);
  console.log(dbResponse);
});

// Based On district Id Select StateName API
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getQuery = `
    SELECT state_name AS stateName
    FROM district 
    NATURAL JOIN state 
    WHERE district_id = ${districtId};`;
  const responseDb = await db.get(getQuery);
  response.send(responseDb);
});

module.exports = app;
