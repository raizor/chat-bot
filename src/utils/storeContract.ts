import { logEvent, LoggableEvents } from "./logEvent";
import { Participant } from "./offerContract";

const mariadb = require("mariadb");
const dbData = require("../../dbData");

const pool = mariadb.createPool({
    host: dbData.host,
    user: dbData.user,
    password: dbData.password,
    database: dbData.database,
    connectionLimit: 5
});

/**
 * Safely creates the contracts table in case it doesn't exist yet.
 */
export async function createContractsTable(connection) {
    //Start by checking if the table is there and create if not
    await connection.query(
        `CREATE TABLE IF NOT EXISTS \n\
            Contracts(\n\
                ApplicationId INT, \n\
                CreationTime DATETIME, \n\
                Completed INT, \n\
                ConfirmKey varchar(255), \n\
                SharedAddress varchar(255), \n\
                DonorWallet varchar(255), \n\
                DonorDevice varchar(255), \n\
                ProducerWallet varchar(255), \n\
                ProducerDevice varchar(255), \n\
                Price INT, \n\
                PRIMARY KEY (ApplicationId)\n\
            )`
    );
}

/**
 * Function for storing the contract in our database
 * @param applicationId Id for the application in the contract
 */
export async function storeContract(
    sharedAddress: string,
    applicationId: number,
    timestamp: Date,
    confirmKey: string,
    donor: Participant,
    producer: Participant,
    price: number,
    bytes: number
) {
    let connection;

    try {
        connection = await pool.getConnection();
        await createContractsTable(connection);

        //Insert the contract into DB
        await connection.query(
            "INSERT INTO Contracts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                applicationId,
                timestamp
                    .toISOString()
                    .slice(0, 19)
                    .replace("T", " "),
                0,
                confirmKey,
                sharedAddress,
                donor.walletAddress,
                donor.deviceAddress,
                producer.walletAddress,
                producer.deviceAddress,
                price,
                bytes
            ]
        );
    } catch (err) {
        logEvent(LoggableEvents.UNKNOWN, { error: err });
    } finally {
        // End the process after the job finishes
        if (connection) {
            connection.end();
        }
    }
}

/**
 * Function for the GBYTE_USD exchange rate from Obyte network in our database
 * @param exchangeRate The GBYTE_USD rate
 */
export async function updateByteExchangeRate(
    exchangeRate: number
) {
    let connection;

    try {
        connection = await pool.getConnection();
        await createContractsTable(connection);

        //Update the OByte into DB
        await connection.query(
            "UPDATE ByteExchangeRate Set GBYTE_USD = ? where Id = 1",
            [
                exchangeRate
            ]
        );
    } catch (err) {
        logEvent(LoggableEvents.UNKNOWN, { error: err });
    } finally {
        // End the process after the job finishes
        if (connection) {
            connection.end();
        }
    }
}

/**
 * Method to be executed once a contract is finalized (i.e. payment has been received)
 */
export async function completeContract(applicationId: string) {
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.query("UPDATE Contracts SET Completed = 1 WHERE ApplicationId = ?", [applicationId]);
    } catch (err) {
        logEvent(LoggableEvents.UNKNOWN, { error: err });
    } finally {
        // End the process after the job finishes
        if (connection) {
            connection.end();
        }
    }
}
