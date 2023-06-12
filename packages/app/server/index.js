const https = require("https");
const fs = require("fs");
const Buffer = require("buffer").Buffer;
const express = require("express");
const path = require("path");
const app = express();
const port = 443;
const padName = "application_pad";
const distFolder = path.join(__dirname, "../client/dist");
const etherpadPort = 9001;
const etherpadProtocol = "https";
const etherpadHost = `${etherpadProtocol}://127.0.0.1:${etherpadPort}`;
const etherpadApiEndpoint = "/api/1.2.15/";
const apiKey =
  "59e716a95f5a137cea0834a8c2f81c6f3ce1574edd0cfdfbfdb97f81a52771f1";
const appConfigurationFile = "app_configuration.json";

function getConfiguration() {
  const configuration = JSON.parse(
    fs.readFileSync(appConfigurationFile, "utf-8")
  );
  return configuration;
}
function stringifyConfiguration(configuration) {
  return JSON.stringify(configuration, null, " ");
}

// USED ONLY FOR DEVELOPMENT, DO NOT USE ON PRODUCTION
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

// Validate that the file exists
fs.open(appConfigurationFile, (err, fd) => {
  // create the file should it doesn't exist
  if (err) {
    try {
      fs.writeFileSync(
        appConfigurationFile,
        stringifyConfiguration({ appId: Date.now(), users: {} })
      );
    } catch (error) {
      console.log({ error });
    }
  }

  fs.readFile(appConfigurationFile, (err, data) => {
    if (err === null) {
      const configuration = JSON.parse(data);
      const { appId } = configuration;
      let { groupId } = configuration;

      if (groupId === undefined) {
        // generate the appropriate group ID
        const request = https
          .request(
            etherpadHost,
            {
              path:
                `${etherpadApiEndpoint}createGroupIfNotExistsFor?apikey=${apiKey}` +
                `&groupMapper=${appId}`,
            },
            (createGroupResponse) => {
              const data = [];

              createGroupResponse.on("data", (chunk) => {
                data.push(chunk);
              });
              createGroupResponse.on("end", () => {
                const { statusCode } = createGroupResponse;
                const stringifiedResponse = Buffer.concat(data).toString();

                if (statusCode >= 400) {
                  throw new Error(stringifiedResponse);
                }

                try {
                  const response = JSON.parse(stringifiedResponse);

                  ({ groupID: groupId } = response.data);
                  configuration.groupId = groupId;

                  const createPadPath =
                    `${etherpadApiEndpoint}createGroupPad?apikey=${apiKey}` +
                    `&groupID=${groupId}&padName=${padName}`;
                  const createPadRequest = https.request(
                    etherpadHost,
                    {
                      path: createPadPath,
                    },
                    (createPadResponse) => {
                      const createPadResponseData = [];

                      createPadResponse.on("data", (chunk) => {
                        createPadResponseData.push(chunk);
                      });
                      createPadResponse.on("end", () => {
                        const createPadResponseDataParsed = JSON.parse(
                          Buffer.concat(createPadResponseData).toString()
                        );

                        const { code, data } = createPadResponseDataParsed;

                        if (code === 0) {
                          configuration.padId = data.padID;

                          fs.writeFileSync(
                            appConfigurationFile,
                            stringifyConfiguration(configuration)
                          );
                        } else {
                          console.log("pad could not be created");
                        }
                      });
                    }
                  );

                  createPadRequest.end();
                } catch (error) {
                  console.log({ error });
                }
              });
            }
          )
          .on("error", (error) => {
            console.log({ error });
          });

        request.end();
      }
    }
  });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(distFolder));
app.use("/dist", express.static(distFolder));
app.use("/public", express.static(path.join(__dirname, "../client/public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/public/index.html"));
});
app.post("/authorize", (req, res) => {
  console.log("about to authorize");

  const {
    body: { user_username, user_password },
  } = req;
  const configuration = getConfiguration();
  const { groupId, users } = configuration;
  const user = users[user_username];

  if (user === undefined || user.password !== user_password) {
    res.status(401).send("Unauthorized");
    return;
  }

  const expiration = Math.trunc(Date.now() / 1000 + 3600);
  const urlPath =
    etherpadApiEndpoint +
    `createSession?apikey=${apiKey}&groupID=${groupId}&authorID=${user.authorId}` +
    `&validUntil=${expiration}`;

  // generate a session for the user
  https
    .get(etherpadHost, { path: urlPath }, (sessionIdResponse) => {
      const data = [];
      const { statusCode } = sessionIdResponse;

      sessionIdResponse.on("data", (chunk) => {
        data.push(chunk);
      });
      sessionIdResponse.on("end", () => {
        const response = JSON.parse(Buffer.concat(data).toString());

        if (statusCode !== 200) {
          res.status(statusCode).send();
        } else {
          const {
            data: { sessionID },
          } = response;

          res.cookie("sessionID", sessionID);
          res.redirect("/");
        }
      });
    })
    .on("error", (error, a) => {
      console.log({ a, error });
      console.log("Error: ", error.message);
    });
});
app.post("/sign_up", (req, res) => {
  const {
    body: { password, username, name },
  } = req;

  if (
    username === undefined ||
    username === "" ||
    password === undefined ||
    password === ""
  ) {
    // both, password and username are necessary
    res.status(400).redirect("/");
  }

  fs.readFile(appConfigurationFile, "utf-8", (err, data) => {
    if (err === null) {
      const configuration = JSON.parse(data);
      const { users } = configuration;

      if (users[username] !== undefined) {
        // user already exist
        res.status(409).redirect("/");
      }

      /**
       * "userId" implementation is simply the value of the user on the list: ID 1 for
       * the first element in the dictionary, ID 2 for the second element, and so forth
       */
      const nextUserId = Object.keys(users).length + 1;

      const createAuthorRequest = https.request(
        etherpadHost,
        {
          path:
            `${etherpadApiEndpoint}/createAuthorIfNotExistsFor?authorMapper=${nextUserId}` +
            `&name=${name}` +
            `&apikey=${apiKey}`,
        },
        (createAuthorResponse) => {
          const data = [];

          createAuthorResponse.on("data", (chunk) => {
            data.push(chunk);
          });
          createAuthorResponse.on("close", () => {
            res.end();
          });
          createAuthorResponse.on("end", () => {
            const { statusCode } = createAuthorResponse;
            const response = JSON.parse(Buffer.concat(data).toString());

            if (statusCode !== 200) {
              res.status(statusCode).send(response);
            } else {
              users[username] = {
                password,
                authorId: response.data.authorID,
              };

              try {
                fs.writeFileSync(
                  appConfigurationFile,
                  stringifyConfiguration(configuration)
                );

                res.redirect("/");
              } catch (error) {
                console.log({ error });
                res.status(500).send("Error signing user up");
              }
            }
          });
        }
      );

      createAuthorRequest.end();
    }
  });
});
app.get("/group_id", (req, res) => {
  fs.readFile(appConfigurationFile, (err, data) => {
    if (err === null) {
      const configuration = JSON.parse(data);
      const { groupID, appId } = configuration;

      if (groupID !== undefined) {
        return res.json({ groupID });
      }

      const request = https.request(
        etherpadHost,
        {
          path:
            `${etherpadApiEndpoint}createGroupIfNotExistsFor?apikey=${apiKey}` +
            `&groupMapper=${appId}`,
        },
        (createGroupResponse) => {
          const data = [];

          createGroupResponse.on("data", (chunk) => {
            data.push(chunk);
          });
          createGroupResponse.on("close", () => {
            res.end();
          });
          createGroupResponse.on("end", () => {
            const { statusCode } = createGroupResponse;
            const response = JSON.parse(Buffer.concat(data).toString());

            if (response >= 400) {
              res.status(statusCode).send(response);
            } else {
              try {
                configuration.groupID = response.data.groupID;

                fs.writeFileSync(
                  appConfigurationFile,
                  stringifyConfiguration(configuration)
                );
                res.send(response);
              } catch (error) {
                console.log({ error });
                res.status(500).send('Could not complete generating "groupID"');
              }
            }
          });
        }
      );

      request.end();
    }
  });
});
app.get("/pad_id", (req, res) => {
  try {
    const configuration = getConfiguration();
    const { padId, groupId } = configuration;

    res.json({ groupId, padId });
  } catch (error) {
    res.status(500).send("Error reading configuration");
  }
});
const options = {
  key: fs.readFileSync(path.join(__dirname, "../../../localhost-key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../../../localhost.pem")),
};
https.createServer(options, app).listen(port);
