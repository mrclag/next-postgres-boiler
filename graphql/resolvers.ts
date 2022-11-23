// import prisma from '../lib/prisma'

export const resolvers = {
  Query: {
    // _parent contains return value of this fields parent
    // args contains all the arguments passed to a query/mutation
    // context contains contextual info about a query/mutation,
    //    such as who the logged in user is, db connections, etc
    links: async (_parent, _args, context) => await context.prisma.link.findMany(),
  }
}