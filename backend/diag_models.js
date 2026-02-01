import { sequelize } from './models/index.js';

async function diag() {
    try {
        await sequelize.authenticate();
        console.log("Registered Models:", Object.keys(sequelize.models));
        
        for (const modelName of Object.keys(sequelize.models)) {
            const tableAttributes = sequelize.models[modelName].getAttributes();
            console.log(`\nModel: ${modelName}`);
            console.log("Columns:", Object.keys(tableAttributes));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

diag();
