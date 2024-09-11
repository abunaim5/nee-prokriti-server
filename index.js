require('dotenv').config();
const { MongoClient, ServerApiVersion, serialize } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PROT || 5000;

// middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xtia1kx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const productCollection = client.db('neeProkritiDB').collection('products');

        // find all products related apis
        app.get('/products', async (req, res) => {
            // pagination related queries
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            let skip = (page * size) - size;

            // query and options
            let query = {};

            let options = {
                skip: skip,
                limit: size,
                sort: {}
            };

            // search related queries
            // const searchText = req.query.search;
            // if (searchText) {
            //     query.name = {
            //         $regex: searchText,
            //         $options: 'i'
            //     }
            // };

            // filter related queries
            const collection = req.query.filter;
            if (collection !== 'all') {
                query.collection = collection;
            }

            // sort related queries
            const sortPriceVal = req.query.sort;
            switch (sortPriceVal) {
                case 'default':
                    options.sort = { createdAt: -1 };
                    break;
                case 'low':
                    options.sort.price = 1;
                    break;
                case 'high':
                    options.sort.price = -1;
                    break;
                default:
                    options.sort = { createdAt: -1 };
            };

            const products = await productCollection.find(query, options).toArray();
            res.send(products);
        });

        // find product unique categories related api
        app.get('/categories', async (req, res) => {
            try {
                const collection = req.query.collection;
                let $match = {}
                if (collection !== 'all') {
                    $match.collection = collection;
                }
                const pipeline = [
                    {
                        $match
                    },
                    {
                        $group: {
                            _id: '$category',
                            totalProducts: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            category: '$_id',
                            totalProducts: 1
                        }
                    }
                ]

                const categories = await productCollection.aggregate(pipeline).toArray();
                res.send(categories);
            } catch (error) {
                console.error(error);
            }
        });

        // find products with searching related api
        app.get('/searchProducts', async (req, res) => {
            const searchText = req.query.search;

            const query = {
                name: {
                    $regex: searchText,
                    $options: 'i'
                }
            };

            const searchResult = await productCollection.find(query).toArray();
            res.send(searchResult);
        });

        // find total product count related api
        app.get('/productCount', async (req, res) => {
            let query = {}

            const searchText = req.query.search;
            if (searchText) {
                query.name = {
                    $regex: searchText,
                    $options: 'i'
                }
            };

            const collection = req.query.filter;
            if (collection && collection !== 'all') {
                query.collection = collection;
            }

            const count = await productCollection.countDocuments(query);
            res.send({ count });
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// basic server apis
app.get('/', (req, res) => {
    res.send('NeeProkriti server is running');
});

app.listen(port, () => {
    console.log(`NeeProkriti server is running on PORT ${port}`);
});