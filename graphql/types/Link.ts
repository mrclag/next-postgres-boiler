import { nonNull, objectType, stringArg, extendType, intArg } from 'nexus';
import {User} from './User'
import { connectionFromArraySlice, cursorToOffset } from 'graphql-relay';

export const Link = objectType({
  name: 'Link',
  definition(t) {
    t.string('id');
    t.int('index');
    t.string('title');
    t.string('url');
    t.string('description');
    t.string('imageUrl');
    t.string('category');
    t.list.field('users', {
      type: User,
      async resolve(parent, _args, ctx) {
        return await ctx.prisma.link.findUnique({
          where: {
            id: parent.id
          }
        }).users()
      }
    })
  },
});

export const Edge = objectType({
  name: 'Edge',
  definition(t) {
    t.string('cursor');
    t.field('node', {
      type: Link
    })
  }
})

export const PageInfo = objectType({
  name: 'PageInfo',
  definition(t) {
    t.string('endCursor');
    t.boolean('hasNextPage')
  }
})

export const Response = objectType({
  name: 'Response',
  definition(t) {
    t.field('pageInfo', {type: PageInfo});
    t.list.field('edges', {
      type: Edge
    })
  }
})

// export const LinksQuery = extendType({
//   type: 'Query',
//   definition(t) {
//     t.field('links', {
//       type: 'Response',
//       args: {
//         first: intArg(),
//         after: stringArg(),
//       },
//       async resolve(_, args, ctx) {
//         return {
//           edges: [
//             {
//               cursor: '',
//               node: {
//                 title: '',
//                 category: '',
//                 imageUrl: '',
//                 url: '',
//                 description: '',
//               },
//             },
//           ],
//         }
//       },
//     })
//   },
// })

// nexus extendtype allows us to define queries

// export const LinksQuery = extendType({
//   type: 'Query',
//   definition(t) {
//     t.nonNull.list.field('links', {
//       type: 'Link',
//       resolve(_parent, _args, ctx) {
//         return ctx.prisma.link.findMany()
//       }
//     })
//   }
// });

// This type of pagination is good if there are not a whole lot of records
// and you want to do pagination, but it will have to go through all
// of the records each time it wants to paginate (very slow)
// export const LinksQuery = extendType({
//   type: 'Query',
//   definition(t) {
//     t.connectionField('links', {
//       type: Link,
//       resolve: async (_, { after, first }, ctx) => {
//         const offset = after ? cursorToOffset(after) + 1 : 0;
//         if (isNaN(offset)) throw new Error('cursor is invalid');

//         const [totalCount, items] = await Promise.all([
//           ctx.prisma.link.count(),
//           ctx.prisma.link.findMany({
//             take: first,
//             skip: offset,
//           }),
//         ]);

//         return connectionFromArraySlice(
//           items,
//           { first, after },
//           { sliceStart: offset, arrayLength: totalCount }
//         );
//       },
//     });
//   },
// });

export const LinksQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field('links', {
      type: 'Response',
      args: {
        first: intArg(),
        after: stringArg(),
      },
      async resolve(_, args, ctx) {
        let queryResults = null

        if (args.after) {
          // check if there is a cursor as the argument
          queryResults = await ctx.prisma.link.findMany({
            take: args.first, // the number of items to return from the database
            skip: 1, // skip the cursor
            cursor: {
              id: args.after, // the cursor
            },
          })
        } else {
          // if no cursor, this means that this is the first request
          //  and we will return the first items in the database
          // not part of the pagination
          queryResults = await ctx.prisma.link.findMany({
            take: args.first,
          })
        }
        // if the initial request returns links
        if (queryResults.length > 0) {

          // If there results, we want to include whether or not 
          // there are more pages to fetch or not.
          // get last element in previous result set
          const lastLinkInResults = queryResults[queryResults.length - 1]
          // cursor we'll return in subsequent requests
          const myCursor = lastLinkInResults.id

          // based on the second query, we can tell if there are more pages to
          // fetch or not.
          // query after the cursor to check if we have nextPage
          const secondQueryResults = await ctx.prisma.link.findMany({
            take: args.first,
            cursor: {
              id: myCursor,
            },
          })
          // return response
          const result = {
            pageInfo: {
              endCursor: myCursor,
              hasNextPage: secondQueryResults.length >= args.first, //if the number of items requested is greater than the response of the second query, we have another page
            },
            edges: queryResults.map(link => ({
              cursor: link.id,
              node: link,
            })),
          }

          return result
        }
        //
        return {
          pageInfo: {
            endCursor: null,
            hasNextPage: false,
          },
          edges: [],
        }
      },
    })
  },
})

export const CreateLinkMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createLink', {
      type: Link,
      args: {
        title: nonNull(stringArg()),
        url: nonNull(stringArg()),
        imageUrl: nonNull(stringArg()),
        category: nonNull(stringArg()),
        description: nonNull(stringArg()),
      },
      async resolve(_parent, args, ctx) {
        if (!ctx.user) {
          throw new Error(`You need to be logged in to perform an action`)
        }

        const user = await ctx.prisma.user.findUnique({
          where: {
            email: ctx.user.email,
          },
        });

         if (user.role !== 'ADMIN') {
          throw new Error(`You do not have permission to perform action`);
        }

        const newLink = {
          title: args.title,
          url: args.url,
          imageUrl: args.imageUrl,
          category: args.category,
          description: args.description,
        };

        return await ctx.prisma.link.create({
          data: newLink,
        });
      },
    });
  },
});