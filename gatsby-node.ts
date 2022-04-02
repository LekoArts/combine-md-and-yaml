import type { GatsbyNode } from "gatsby"

const mdResolverPassthrough = (fieldName) => async (source, args, context, info) => {
  const type = info.schema.getType(`MarkdownRemark`)
  const mdNode = context.nodeModel.getNodeById({
    id: source.parent,
  })
  const resolver = type.getFields()[fieldName].resolve
  const result = await resolver(mdNode, args, context, {
    fieldName,
  })
  return result
}

export const createSchemaCustomization: GatsbyNode["createSchemaCustomization"] = ({ actions }) => {
  const { createTypes, createFieldExtension } = actions

  createFieldExtension({
    name: `mdpassthrough`,
    args: {
      fieldName: `String!`,
    },
    extend({ fieldName }) {
      return {
        resolve: mdResolverPassthrough(fieldName),
      }
    },
  })

  createTypes(`#graphql
    interface BlogPost implements Node {
      id: ID!
      title: String
      date: Date
      body: String
    }

    type MarkdownBlogPost implements BlogPost & Node {
      id: ID!
      title: String
      date: Date
      body: String @mdpassthrough(fieldName: "html")
    }

    type DataYaml implements BlogPost & Node {
      id: ID!
      title: String
      date: Date
      body: String
    }
  `)
}

export const onCreateNode: GatsbyNode["onCreateNode"] = ({ node, actions, getNode, createNodeId, createContentDigest }, themeOptions) => {
  const { createNode, createParentChildLink } = actions

  if (node.internal.type !== `MarkdownRemark`) {
    return
  }

  if (node.internal.type === `MarkdownRemark`) {
    const fieldData = {
      // @ts-ignore
      title: node.frontmatter.title,
      // @ts-ignore
      date: node.frontmatter.date,
    }

    const mdPostId = createNodeId(`${node.id} >>> MarkdownBlogPost`)

    createNode({
      ...fieldData,
      // Required fields
      id: mdPostId,
      parent: node.id,
      children: [],
      internal: {
        type: `MarkdownBlogPost`,
        contentDigest: createContentDigest(fieldData),
        content: JSON.stringify(fieldData),
        description: `MD implementation of the BlogPost interface`,
      },
    })

    createParentChildLink({ parent: node, child: getNode(mdPostId) })
  }
}