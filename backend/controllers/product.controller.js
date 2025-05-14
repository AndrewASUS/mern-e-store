import Product from "../models/product.model.js"
import { redis } from "../lib/redis.js"
import cloudinary from "../lib/cloudinary.js"


export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}) // If you leave {} inside the parameters, this will get all by default
    res.json({ products })
  } catch (error) {
    console.log("Error in getAllProducts functions product.controller.js", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}



export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_producst")
    if (featuredProducts) {
      return res.json(JSON.parse(featuredProducts))
    }

    // If not in redis, fetch from mongoDB
    // .lean() will return a plain Javascript object instead of a mongoDB document, which is better for performance
    featuredProducts = await Product.find({isFeatured: true}).lean()

    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" })
    }

    // Store in rdis for future quick access
    await redis.set("eatured_producst", JSON.stringify(featuredProducts))
    res.json(featuredProducts)
  } catch (error) {
    console.log( "Error in getFeaturedProducts function, product.controller.js", error.message)
    res.status(500).json({ message: "Serber error", error: error.message })

  }
}



export const createProduct = async (req, res) => {
	try {
		const { name, description, price, image, category } = req.body;

		let cloudinaryResponse = null;

		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
		}

		const product = await Product.create({
			name,
			description,
			price,
			image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
			category,
		});

		res.status(201).json(product);
	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
}



export const deleteProduct = async (req, res) => {
  try {
    // Deletes image from cloudinary
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0] // This will grab the id of the image
    }

    try {
      await cloudinary.uploader.destroy(`products/${publicId}`)
      console.log("Deleted image from cloudinary")
    } catch (error) {
      console.log("Error deleting image from cloudinary", error)
    }

    // Deletes image from the database
    await Product.findByIdAndDelete(req.params.id)
    res.json({ message: "Product deleted successfully" })

  } catch (error) {
    console.log("Error in deleteProduct function, product.controller.js", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}



export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 3 }
      },
      {
        $project: {
          _id:1,
          name: 1,
          description: 1,
          image: 1,
          price: 1
        }
      }
    ])

    res.json(products)
  } catch (error) {
    console.log("Error in getRecommendedProducts function, product.controller.js", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}



export const getProductsByCategory = async (req, res) => {
  const { category } = req.params
  try {
    const products = await Product.find({ category })
    res.json({ products })

  } catch (error) {
    console.log("Error in getProductsByCategory function, product.controller.js", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}



export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (product) {
      product.isFeatured = !product.isFeatured
      const updatedProduct = await product.save()

      // Update cache/redis
      await updateFeaturedProductsCache()
      res.json(updatedProduct)

    } else {
      res.status(404).json({ message: "Product not found" })
    }

  } catch (error) {
    console.log("Error in toggleFeaturedProduct controller, product.controller.js", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}


async function updateFeaturedProductsCache() {
  try {
    // .lean() will return a plain Javascript object instead of a mongoDB document, which is better for performance
    const featuredProducts = await Product.find({ isFeatured: true }).lean()
    await redis.set("featured_products", JSON.stringify(featuredProducts))
  } catch (error) {
    console.log("Error in updateFeaturedProductsCache function, product.controller.js", error.message)
  }
}
